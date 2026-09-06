import type { Pool } from 'pg';

const scanMinutes = Number(process.env.LOYALTY_EXPIRY_SCAN_MINUTES ?? '15');
const batchSize = Number(process.env.LOYALTY_EXPIRY_BATCH_SIZE ?? '250');

if (!Number.isFinite(scanMinutes) || scanMinutes < 1 || scanMinutes > 1440) {
  throw new Error('LOYALTY_EXPIRY_SCAN_MINUTES must be between 1 and 1440');
}
if (!Number.isFinite(batchSize) || batchSize < 1 || batchSize > 500) {
  throw new Error('LOYALTY_EXPIRY_BATCH_SIZE must be between 1 and 500');
}

let nextScanAt = 0;

export async function runRewardRedemptionExpiryMaintenance(
  pool: Pool,
  force = false,
): Promise<{ ran: boolean; expired: number; olivesRefunded: number }> {
  const now = Date.now();
  if (!force && now < nextScanAt) {
    return { ran: false, expired: 0, olivesRefunded: 0 };
  }

  try {
    const result = await pool.query<{ refunded_olives: string | number }>(
      'select refunded_olives from loyalty_expire_redemptions(null, $1)',
      [Math.trunc(batchSize)],
    );

    const olivesRefunded = result.rows.reduce(
      (total, row) => total + Number(row.refunded_olives),
      0,
    );

    nextScanAt = Date.now() + scanMinutes * 60_000;
    const summary = {
      ran: true,
      expired: result.rowCount ?? result.rows.length,
      olivesRefunded,
    };

    if (summary.expired > 0) {
      console.log(JSON.stringify({
        event: 'loyalty_redemption_expiry_completed',
        expired: summary.expired,
        olives_refunded: summary.olivesRefunded,
      }));
    }

    return summary;
  } catch (error) {
    nextScanAt = Date.now() + Math.min(scanMinutes * 60_000, 60_000);
    console.warn(JSON.stringify({
      event: 'loyalty_redemption_expiry_failed',
      error: error instanceof Error ? error.message : String(error),
    }));
    return { ran: true, expired: 0, olivesRefunded: 0 };
  }
}
