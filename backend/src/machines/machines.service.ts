import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DRIZZLE } from '../db/database.module';
import type { Database } from '../db/database.module';

@Injectable()
export class MachinesService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  /** All machines with their latest known position (NULL position if none yet). */
  async findAllWithLastPosition() {
    const result = await this.db.execute(sql`
      SELECT
        m.id,
        m.name,
        ST_X(p.geom)        AS lng,
        ST_Y(p.geom)        AS lat,
        p.recorded_at       AS "recordedAt"
      FROM machines m
      LEFT JOIN LATERAL (
        SELECT geom, recorded_at
        FROM positions
        WHERE machine_id = m.id
        ORDER BY recorded_at DESC
        LIMIT 1
      ) p ON true
      ORDER BY m.name
    `);
    return result.rows.map((r) => ({
      id: r.id,
      name: r.name,
      lastPosition:
        r.lng === null
          ? null
          : {
              lng: Number(r.lng),
              lat: Number(r.lat),
              recordedAt: r.recordedAt,
            },
    }));
  }

  /** Full ordered trace of a machine. */
  async getTrack(id: string) {
    const machine = await this.db.execute(
      sql`SELECT id, name FROM machines WHERE id = ${id}`,
    );
    if (machine.rows.length === 0) {
      throw new NotFoundException(`Machine ${id} not found`);
    }

    const points = await this.db.execute(sql`
      SELECT
        ST_X(geom)    AS lng,
        ST_Y(geom)    AS lat,
        recorded_at   AS "recordedAt"
      FROM positions
      WHERE machine_id = ${id}
      ORDER BY recorded_at ASC
    `);

    return {
      machine: machine.rows[0],
      points: points.rows.map((r) => ({
        lng: Number(r.lng),
        lat: Number(r.lat),
        recordedAt: r.recordedAt,
      })),
    };
  }

  /**
   * Distance (in metres) actually travelled by a machine *inside* a zone.
   * Done entirely in PostGIS:
   *   ST_MakeLine over the ordered points -> the trajectory,
   *   ST_Intersection with the zone polygon -> the portion inside,
   *   ST_Length(::geography) -> length in metres on the spheroid.
   */
  async distanceInZone(machineId: string, zoneId: string) {
    const result = await this.db.execute(sql`
      WITH trajectory AS (
        SELECT ST_MakeLine(geom ORDER BY recorded_at) AS geom
        FROM positions
        WHERE machine_id = ${machineId}
      ),
      inside AS (
        SELECT ST_Intersection(t.geom, z.geom) AS geom
        FROM trajectory t, zones z
        WHERE z.id = ${zoneId}
      )
      SELECT
        COALESCE(ST_Length(geom::geography), 0) AS meters,
        ST_AsGeoJSON(geom)::json                AS geometry
      FROM inside
    `);

    if (result.rows.length === 0) {
      throw new NotFoundException(`Zone ${zoneId} not found`);
    }
    const row = result.rows[0];
    return {
      machineId,
      zoneId,
      meters: Number(row.meters),
      geometry: row.geometry, // GeoJSON of the clipped trajectory (may be null)
    };
  }
}
