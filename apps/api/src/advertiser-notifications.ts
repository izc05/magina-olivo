import { randomUUID } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';

type Db = Pick<Pool, 'query'> | Pick<PoolClient, 'query'>;

type AdvertiserNotificationType =
  | 'application_approved'
  | 'profile_change_approved'
  | 'profile_change_rejected'
  | 'campaign_ending'
  | 'renewal_due'
  | 'billing_due'
  | 'billing_overdue';

type AdvertiserNotificationSeverity = 'info' | 'action' | 'warning';

export async function createAdvertiserNotification(
  db: Db,
  input: {
    advertiserId: string;
    targetUserId?: string | null;
    type: AdvertiserNotificationType;
    severity?: AdvertiserNotificationSeverity;
    eventKey: string;
    title: string;
    body: string;
    actionUrl?: string | null;
    emailEligible?: boolean;
  },
): Promise<string | null> {
  const result = await db.query<{ id: string }>(`
    insert into advertiser_notifications (
      id, advertiser_id, target_user_id, notification_type, severity,
      event_key, title, body, action_url, email_eligible
    ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    on conflict (event_key) do nothing
    returning id
  `, [
    randomUUID(),
    input.advertiserId,
    input.targetUserId ?? null,
    input.type,
    input.severity ?? 'info',
    input.eventKey,
    input.title,
    input.body,
    input.actionUrl ?? '/anunciante',
    input.emailEligible ?? true,
  ]);
  return result.rows[0]?.id ?? null;
}
