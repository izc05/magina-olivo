import { createPrivateKey, sign } from 'node:crypto';
import type { Pool } from 'pg';

export type PushCategory = 'weather' | 'tasks' | 'rewards';

type PushSubscriptionRow = {
  id: string;
  endpoint: string;
};

type VapidConfig = {
  publicKey: string;
  privateKey: string;
  subject: string;
};

function base64UrlEncode(value: Buffer | string): string {
  const buffer = typeof value === 'string' ? Buffer.from(value, 'utf8') : value;
  return buffer.toString('base64url');
}

function decodeBase64Url(value: string): Buffer {
  try {
    return Buffer.from(value, 'base64url');
  } catch {
    return Buffer.alloc(0);
  }
}

function loadVapidConfig(): VapidConfig | null {
  const publicKey = process.env.WEB_PUSH_VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.WEB_PUSH_VAPID_PRIVATE_KEY?.trim();
  const subject = process.env.WEB_PUSH_VAPID_SUBJECT?.trim();
  if (!publicKey && !privateKey && !subject) return null;
  if (!publicKey || !privateKey || !subject) {
    throw new Error('WEB_PUSH_VAPID_PUBLIC_KEY, WEB_PUSH_VAPID_PRIVATE_KEY and WEB_PUSH_VAPID_SUBJECT must be configured together');
  }
  if (!subject.startsWith('mailto:') && !subject.startsWith('https://')) {
    throw new Error('WEB_PUSH_VAPID_SUBJECT must use mailto: or https:');
  }
  const publicBytes = decodeBase64Url(publicKey);
  const privateBytes = decodeBase64Url(privateKey);
  if (publicBytes.length !== 65 || publicBytes[0] !== 0x04) {
    throw new Error('WEB_PUSH_VAPID_PUBLIC_KEY must be an uncompressed P-256 public key');
  }
  if (privateBytes.length !== 32) {
    throw new Error('WEB_PUSH_VAPID_PRIVATE_KEY must be a 32-byte P-256 private scalar');
  }
  return { publicKey, privateKey, subject };
}

export function buildVapidAuthorization(endpoint: string, now = new Date()): { authorization: string; audience: string } {
  const config = loadVapidConfig();
  if (!config) throw new Error('Web Push VAPID is not configured');

  const url = new URL(endpoint);
  if (url.protocol !== 'https:') throw new Error('Push endpoint must use HTTPS');
  const audience = url.origin;
  const publicBytes = decodeBase64Url(config.publicKey);
  const privateBytes = decodeBase64Url(config.privateKey);
  const x = publicBytes.subarray(1, 33).toString('base64url');
  const y = publicBytes.subarray(33, 65).toString('base64url');
  const d = privateBytes.toString('base64url');
  const key = createPrivateKey({
    key: { kty: 'EC', crv: 'P-256', x, y, d },
    format: 'jwk',
  });

  const header = base64UrlEncode(JSON.stringify({ typ: 'JWT', alg: 'ES256' }));
  const issuedAt = Math.floor(now.getTime() / 1000);
  const payload = base64UrlEncode(JSON.stringify({
    aud: audience,
    exp: issuedAt + (12 * 60 * 60),
    sub: config.subject,
  }));
  const unsigned = `${header}.${payload}`;
  const signature = sign('sha256', Buffer.from(unsigned), {
    key,
    dsaEncoding: 'ieee-p1363',
  }).toString('base64url');
  const token = `${unsigned}.${signature}`;

  return {
    audience,
    authorization: `vapid t=${token}, k=${config.publicKey}`,
  };
}

export function categoryPreferenceColumn(category: PushCategory): 'notify_weather' | 'notify_tasks' | 'notify_rewards' {
  switch (category) {
    case 'weather': return 'notify_weather';
    case 'tasks': return 'notify_tasks';
    case 'rewards': return 'notify_rewards';
  }
}

async function recordPushSuccess(pool: Pool, subscriptionId: string): Promise<void> {
  await pool.query(
    `
      update push_subscriptions
      set failure_count = 0,
          last_success_at = now(),
          last_failure_at = null,
          updated_at = now()
      where id = $1
    `,
    [subscriptionId],
  );
}

async function recordPushFailure(pool: Pool, subscriptionId: string, permanent: boolean): Promise<void> {
  await pool.query(
    `
      update push_subscriptions
      set enabled = case when $2 then false else enabled end,
          failure_count = failure_count + 1,
          last_failure_at = now(),
          updated_at = now()
      where id = $1
    `,
    [subscriptionId, permanent],
  );
}

export async function sendEmptyPushToUser(
  pool: Pool,
  userId: string,
  category: PushCategory,
): Promise<{ configured: boolean; attempted: number; delivered: number; disabled: number }> {
  const config = loadVapidConfig();
  if (!config) return { configured: false, attempted: 0, delivered: 0, disabled: 0 };

  const preferenceColumn = categoryPreferenceColumn(category);
  const result = await pool.query<PushSubscriptionRow>(
    `
      select ps.id, ps.endpoint
      from push_subscriptions ps
      left join user_preferences up on up.user_id = ps.user_id
      where ps.user_id = $1
        and ps.enabled = true
        and coalesce(up.${preferenceColumn}, true) = true
      order by ps.created_at asc, ps.id asc
    `,
    [userId],
  );

  let delivered = 0;
  let disabled = 0;
  for (const subscription of result.rows) {
    try {
      const vapid = buildVapidAuthorization(subscription.endpoint);
      const response = await fetch(subscription.endpoint, {
        method: 'POST',
        headers: {
          authorization: vapid.authorization,
          ttl: '300',
          urgency: 'normal',
        },
        signal: AbortSignal.timeout(10_000),
      });

      if (response.ok) {
        await recordPushSuccess(pool, subscription.id);
        delivered += 1;
        continue;
      }

      const permanent = response.status === 404 || response.status === 410;
      await recordPushFailure(pool, subscription.id, permanent);
      if (permanent) disabled += 1;
    } catch {
      await recordPushFailure(pool, subscription.id, false);
    }
  }

  return {
    configured: true,
    attempted: result.rows.length,
    delivered,
    disabled,
  };
}
