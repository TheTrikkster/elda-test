import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Pool } from 'pg';

interface SeedPoint {
  lat: number;
  lng: number;
  timestamp: string;
}

interface SeedMachine {
  id: string;
  name: string;
  positions: SeedPoint[];
}

interface SeedFile {
  zone: { type: 'Polygon'; coordinates: number[][][] };
  machines: SeedMachine[];
}

async function main() {
  const file = join(__dirname, '..', '..', 'data', 'elda_seed_dameuses.json');
  const { machines, zone } = JSON.parse(readFileSync(file, 'utf8')) as SeedFile;

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      'TRUNCATE positions, machines, zones RESTART IDENTITY CASCADE',
    );

    for (const m of machines) {
      await client.query('INSERT INTO machines (id, name) VALUES ($1, $2)', [
        m.id,
        m.name,
      ]);
      for (const p of m.positions) {
        await client.query(
          `INSERT INTO positions (machine_id, geom, recorded_at)
           VALUES ($1, ST_SetSRID(ST_MakePoint($2, $3), 4326), $4)`,
          [m.id, p.lng, p.lat, p.timestamp],
        );
      }
      console.log(`  ${m.name} (${m.id}): ${m.positions.length} positions`);
    }

    await client.query(
      `INSERT INTO zones (id, name, geom)
       VALUES ($1, $2, ST_SetSRID(ST_GeomFromGeoJSON($3), 4326))`,
      ['test-zone', 'Zone de test', JSON.stringify(zone)],
    );

    await client.query('COMMIT');
    console.log(`Seed done: ${machines.length} machines.`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
