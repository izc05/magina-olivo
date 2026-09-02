import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import pg from 'pg';

const { Client } = pg;
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is required');
}

const here = dirname(fileURLToPath(import.meta.url));
const migrationsDir = resolve(here, '../../../db/migrations');
const client = new Client({ connectionString });

await client.connect();

try {
  await client.query("select pg_advisory_lock(hashtext('magina_olivo_migrations'))");
  await client.query(`
    create table if not exists schema_migrations (
      filename text primary key,
      applied_at timestamptz not null default now()
    )
  `);

  const entries = (await readdir(migrationsDir))
    .filter((name) => /^\d+.*\.sql$/.test(name))
    .sort();

  const appliedRows = await client.query<{ filename: string }>(
    'select filename from schema_migrations',
  );
  const applied = new Set(appliedRows.rows.map((row) => row.filename));

  for (const filename of entries) {
    if (applied.has(filename)) continue;

    const sql = await readFile(resolve(migrationsDir, filename), 'utf8');
    console.log(`Applying ${filename}`);

    await client.query('begin');
    try {
      await client.query(sql);
      await client.query(
        'insert into schema_migrations (filename) values ($1)',
        [filename],
      );
      await client.query('commit');
    } catch (error) {
      await client.query('rollback');
      throw error;
    }
  }
} finally {
  await client.query("select pg_advisory_unlock(hashtext('magina_olivo_migrations'))");
  await client.end();
}
