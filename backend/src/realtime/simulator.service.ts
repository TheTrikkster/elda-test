import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { sql } from 'drizzle-orm';
import { DRIZZLE } from '../db/database.module';
import type { Database } from '../db/database.module';
import { PositionsGateway } from './positions.gateway';

interface Pt {
  lng: number;
  lat: number;
}
interface MachineState {
  id: string;
  points: Pt[]; // the seeded trace (immutable)
  idx: number;
  dir: 1 | -1; // ping-pong direction along the trace
}

/**
 * Replays the seeded traces to fake live movement: every tick each machine
 * advances one point along its recorded trace, then bounces back at the ends
 * (ping-pong). This mirrors a groomer working a slope back and forth and keeps
 * machines within their sector, so the "machines currently in zone" query stays
 * meaningful. Each new point is persisted to PostGIS (recorded_at = now) and
 * pushed over the WebSocket — persistence and realtime stay consistent.
 */
@Injectable()
export class SimulatorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SimulatorService.name);
  private timer?: NodeJS.Timeout;
  private states: MachineState[] = [];

  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly gateway: PositionsGateway,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit() {
    await this.loadStates();
    if (this.states.length === 0) {
      this.logger.warn(
        'No machines/positions found — did you run `pnpm seed`?',
      );
      return;
    }
    const interval = Number(this.config.get('SIMULATOR_INTERVAL_MS') ?? 1500);
    this.timer = setInterval(() => void this.tick(), interval);
    this.logger.log(
      `Simulator started: ${this.states.length} machines, every ${interval}ms`,
    );
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  /** Load each machine's ordered trace from the DB into memory. */
  private async loadStates() {
    const machines = await this.db.execute(
      sql`SELECT id FROM machines ORDER BY id`,
    );
    this.states = [];
    for (const m of machines.rows) {
      const id = m.id as string;
      const pts = await this.db.execute(sql`
        SELECT ST_X(geom) AS lng, ST_Y(geom) AS lat
        FROM positions
        WHERE machine_id = ${id}
        ORDER BY recorded_at ASC
      `);
      const points = pts.rows.map((r) => ({
        lng: Number(r.lng),
        lat: Number(r.lat),
      }));
      if (points.length > 0) {
        this.states.push({ id, points, idx: points.length - 1, dir: -1 });
      }
    }
  }

  private nextPoint(state: MachineState): Pt {
    const last = state.points.length - 1;
    let next = state.idx + state.dir;
    if (next > last) {
      next = last - 1;
      state.dir = -1;
    } else if (next < 0) {
      next = 1;
      state.dir = 1;
    }
    state.idx = Math.max(0, Math.min(last, next));
    return state.points[state.idx];
  }

  private async tick() {
    const recordedAt = new Date();
    for (const state of this.states) {
      const pt = this.nextPoint(state);
      try {
        await this.db.execute(sql`
          INSERT INTO positions (machine_id, geom, recorded_at)
          VALUES (
            ${state.id},
            ST_SetSRID(ST_MakePoint(${pt.lng}, ${pt.lat}), 4326),
            ${recordedAt.toISOString()}
          )
        `);
        this.gateway.emitPositionUpdate({
          machineId: state.id,
          lng: pt.lng,
          lat: pt.lat,
          recordedAt: recordedAt.toISOString(),
        });
      } catch (err) {
        this.logger.error(
          `Failed to push position for ${state.id}`,
          err as Error,
        );
      }
    }
  }
}
