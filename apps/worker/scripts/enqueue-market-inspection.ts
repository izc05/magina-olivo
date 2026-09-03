import { randomUUID } from 'node:crypto';
import pg from 'pg';

const { Pool } = pg;
const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) throw new Error('DATABASE_URL is required');

const pool = new Pool({ connectionString: databaseUrl });
const day = new Date().toISOString().slice(0, 10);
const dedupeKey = `public.market.inspect:${day}`;

try {
  const result = await pool.query<{ id: string }>(
    `
      insert into job_queue (id, kind, payload, dedupe_key, max_attempts)
      values ($1, 'public.market.inspect', '{}'::jsonb, $2, 5)
      on conflict (dedupe_key) where dedupe_key is not null do nothing
      returning id
    `,
    [randomUUID(), dedupeKey],
  );

  if (result.rows[0]) {
    console.log(JSON.stringify({ event: 'market_inspection_enqueued', job_id: result.rows[0].id, dedupe_key: dedupeKey }));
  } else {
    console.log(JSON.stringify({ event: 'market_inspection_already_enqueued', dedupe_key: dedupeKey }));
  }
} finally {
  await pool.end();
}
