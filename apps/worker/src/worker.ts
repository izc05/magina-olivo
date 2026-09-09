import pg from 'pg';
import { runRewardRedemptionExpiryMaintenance } from './reward-redemption-expiry.ts';

const { Pool } = pg;
const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) {
  throw new Error('DATABASE_URL is required');
}

const maintenancePool = new Pool({ connectionString: databaseUrl });
let maintenanceInFlight = false;

async function runMaintenance(force = false): Promise<void> {
  if (maintenanceInFlight) return;
  maintenanceInFlight = true;
  try {
    await runRewardRedemptionExpiryMaintenance(maintenancePool, force);
  } finally {
    maintenanceInFlight = false;
  }
}

await runMaintenance(true);
const maintenanceTimer = setInterval(() => {
  void runMaintenance();
}, 60_000);
maintenanceTimer.unref();

try {
  await import('./worker-core.ts');
} finally {
  clearInterval(maintenanceTimer);
  await maintenancePool.end();
}
