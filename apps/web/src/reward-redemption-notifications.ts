import type { RedemptionSummary } from './reward-api.ts';

export type RewardRedemptionNotificationTone = 'warning' | 'success' | 'info';
export type RewardRedemptionNotificationKind = 'expiring' | 'redeemed' | 'refunded';

export type RewardRedemptionNotification = {
  id: string;
  kind: RewardRedemptionNotificationKind;
  tone: RewardRedemptionNotificationTone;
  title: string;
  detail: string;
  occurredAt: string;
  redemptionId: string;
  rewardId: string;
};

const HOUR_MS = 60 * 60 * 1000;
const EXPIRY_WARNING_MS = 48 * HOUR_MS;
const RECENT_TERMINAL_MS = 7 * 24 * HOUR_MS;

function parseTimestamp(value: string | null | undefined): number | null {
  if (!value) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function isActive(status: string): boolean {
  return status === 'reserved' || status === 'issued';
}

function isRecentPast(timestamp: number, nowMs: number): boolean {
  const age = nowMs - timestamp;
  return age >= 0 && age <= RECENT_TERMINAL_MS;
}

function pickupLabel(item: RedemptionSummary): string {
  return item.pickupPoint ? ` · Recogida: ${item.pickupPoint.name}` : '';
}

export function buildRewardRedemptionNotifications(
  items: RedemptionSummary[],
  now: Date = new Date(),
): RewardRedemptionNotification[] {
  const nowMs = now.getTime();
  const notifications: RewardRedemptionNotification[] = [];

  for (const item of items) {
    const expiresAt = parseTimestamp(item.expiresAt);

    if (isActive(item.status) && expiresAt !== null) {
      const remaining = expiresAt - nowMs;
      if (remaining > 0 && remaining <= EXPIRY_WARNING_MS) {
        const hours = Math.max(1, Math.ceil(remaining / HOUR_MS));
        notifications.push({
          id: `${item.id}:expiring`,
          kind: 'expiring',
          tone: 'warning',
          title: hours <= 24 ? 'Tu recompensa caduca hoy' : 'Tu recompensa caduca pronto',
          detail: `${item.rewardTitle} caduca en ${hours} h${pickupLabel(item)}.`,
          occurredAt: item.expiresAt,
          redemptionId: item.id,
          rewardId: item.rewardId,
        });
      }
      continue;
    }

    if (item.status === 'redeemed') {
      const redeemedAt = parseTimestamp(item.redeemedAt);
      if (redeemedAt !== null && isRecentPast(redeemedAt, nowMs)) {
        notifications.push({
          id: `${item.id}:redeemed`,
          kind: 'redeemed',
          tone: 'success',
          title: 'Recogida confirmada',
          detail: `${item.rewardTitle} ya figura como entregada${pickupLabel(item)}.`,
          occurredAt: item.redeemedAt ?? item.reservedAt,
          redemptionId: item.id,
          rewardId: item.rewardId,
        });
      }
      continue;
    }

    if (item.status === 'expired' && expiresAt !== null && isRecentPast(expiresAt, nowMs)) {
      notifications.push({
        id: `${item.id}:refunded`,
        kind: 'refunded',
        tone: 'info',
        title: 'Aceitunas devueltas al saldo',
        detail: `${new Intl.NumberFormat('es-ES').format(item.olivesCost)} 🫒 han vuelto a tu saldo porque ${item.rewardTitle} caducó sin recogida.`,
        occurredAt: item.expiresAt,
        redemptionId: item.id,
        rewardId: item.rewardId,
      });
    }
  }

  return notifications.sort((left, right) => {
    if (left.kind === 'expiring' && right.kind !== 'expiring') return -1;
    if (right.kind === 'expiring' && left.kind !== 'expiring') return 1;

    const leftTime = parseTimestamp(left.occurredAt) ?? 0;
    const rightTime = parseTimestamp(right.occurredAt) ?? 0;

    if (left.kind === 'expiring' && right.kind === 'expiring') return leftTime - rightTime;
    return rightTime - leftTime;
  });
}
