import { Inject, Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DRIZZLE } from '../db/database.module';
import type { Database } from '../db/database.module';

@Injectable()
export class ZonesService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  /** All zones, geometry serialized as GeoJSON by PostGIS. */
  async findAll() {
    const result = await this.db.execute(sql`
      SELECT id, name, ST_AsGeoJSON(geom)::json AS geometry
      FROM zones
      ORDER BY name
    `);
    return result.rows;
  }

  /**
   * Machines whose *latest* position currently sits inside the zone polygon.
   * The containment test is ST_Within, evaluated in the database.
   */
  async machinesInZone(zoneId: string) {
    const result = await this.db.execute(sql`
      WITH latest AS (
        SELECT DISTINCT ON (machine_id)
          machine_id, geom, recorded_at
        FROM positions
        ORDER BY machine_id, recorded_at DESC
      )
      SELECT
        m.id,
        m.name,
        ST_X(l.geom)   AS lng,
        ST_Y(l.geom)   AS lat,
        l.recorded_at  AS "recordedAt"
      FROM latest l
      JOIN machines m ON m.id = l.machine_id
      JOIN zones z    ON z.id = ${zoneId}
      WHERE ST_Within(l.geom, z.geom)
      ORDER BY m.name
    `);
    return result.rows.map((r) => ({
      id: r.id,
      name: r.name,
      lng: Number(r.lng),
      lat: Number(r.lat),
      recordedAt: r.recordedAt,
    }));
  }
}
