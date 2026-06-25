/**
 * Minimal migration runner: applies the hand-authored SQL files in drizzle/
 * in lexical order. We keep the PostGIS DDL in plain SQL (extension, geometry
 * columns, GiST indexes) rather than generating it from the ORM, so a single
 * `pnpm migrate` provisions everything deterministically.
 */
import 'dotenv/config';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { Pool } from 'pg';

async function main() {
  const dir = join(__dirname, '..', '..', 'drizzle');
  const files = readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    for (const file of files) {
      const sql = readFileSync(join(dir, file), 'utf8');
      console.log(`Applying ${file}...`);
      await pool.query(sql);
    }
    console.log('Migrations applied.');
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
