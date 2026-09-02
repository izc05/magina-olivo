import { getMigrations } from 'better-auth/db/migration';
import { auth } from '../src/auth.ts';
import { closeDatabase } from '../src/db.ts';

try {
  const { runMigrations } = await getMigrations(auth.options);
  await runMigrations();
  console.log('Better Auth migrations applied');
} finally {
  await closeDatabase();
}
