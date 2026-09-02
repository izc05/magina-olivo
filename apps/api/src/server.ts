import { buildApp } from './app.ts';
import { closeDatabase } from './db.ts';

const app = buildApp();
const port = Number(process.env.PORT ?? '3001');
const host = process.env.HOST ?? '0.0.0.0';

async function shutdown(signal: string): Promise<void> {
  app.log.info({ signal }, 'shutting down');

  try {
    await app.close();
    await closeDatabase();
    process.exitCode = 0;
  } catch (error) {
    app.log.error({ err: error }, 'shutdown failed');
    process.exitCode = 1;
  }
}

process.once('SIGINT', () => void shutdown('SIGINT'));
process.once('SIGTERM', () => void shutdown('SIGTERM'));

try {
  await app.listen({ port, host });
} catch (error) {
  app.log.error({ err: error }, 'failed to start API');
  await closeDatabase();
  process.exitCode = 1;
}
