import { createHash, randomUUID } from 'node:crypto';
import type { Pool } from 'pg';

type MailTransport = 'disabled' | 'resend';

type PendingDelivery = {
  id: string;
  notification_id: string;
  user_id: string;
  email: string;
  title: string;
  body: string;
  action_url: string | null;
};

function mailTransport(): MailTransport {
  const value = (process.env.COMMERCIAL_MAIL_TRANSPORT ?? 'disabled').trim();
  if (value === 'disabled' || value === 'resend') return value;
  throw new Error(`Unsupported COMMERCIAL_MAIL_TRANSPORT: ${value}`);
}

function requiredEnvironment(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required for commercial mail transport`);
  return value;
}

async function createDueNotifications(pool: Pool): Promise<number> {
  const result = await pool.query<{ inserted: number }>(`
    with candidates as (
      select
        s.advertiser_id,
        'campaign_ending'::text as notification_type,
        case when s.ends_at <= now() + interval '7 days' then 'warning' else 'action' end as severity,
        'campaign-ending:' || s.id::text || ':' || case when s.ends_at <= now() + interval '7 days' then '7d' else '30d' end as event_key,
        'Tu campaña está próxima a finalizar'::text as title,
        case when s.ends_at <= now() + interval '7 days'
          then 'La campaña finaliza en menos de 7 días. Revisa su continuidad desde el Área del Anunciante.'
          else 'La campaña finaliza en menos de 30 días. Puedes revisar su continuidad y renovación.'
        end::text as body,
        '/anunciante'::text as action_url
      from sponsorships s
      where s.status = 'active'
        and s.ends_at > now()
        and s.ends_at <= now() + interval '30 days'

      union all

      select
        c.advertiser_id,
        'renewal_due',
        case when c.renewal_at <= now() + interval '7 days' then 'warning' else 'action' end,
        'renewal-due:' || c.id::text || ':' || case when c.renewal_at <= now() + interval '7 days' then '7d' else '30d' end,
        'Renovación comercial próxima',
        case when c.renewal_at <= now() + interval '7 days'
          then 'La fecha de renovación está a menos de 7 días. Revisa el contrato y contacta con Mágina Olivo si necesitas cambios.'
          else 'La fecha de renovación está a menos de 30 días. Revisa el estado del contrato.'
        end,
        '/anunciante'
      from advertising_commercial_contracts c
      where c.status = 'active'
        and c.renewal_at > now()
        and c.renewal_at <= now() + interval '30 days'

      union all

      select
        c.advertiser_id,
        'billing_due',
        'action',
        'billing-due:' || b.id::text || ':7d',
        'Cobro próximo a vencer',
        'Hay un apunte comercial con vencimiento en los próximos 7 días. El estado mostrado es control interno y no sustituye factura ni justificante bancario.',
        '/anunciante'
      from advertising_billing_entries b
      join advertising_commercial_contracts c on c.id = b.contract_id
      where b.status in ('pending', 'issued')
        and b.due_at > now()
        and b.due_at <= now() + interval '7 days'

      union all

      select
        c.advertiser_id,
        'billing_overdue',
        'warning',
        'billing-overdue:' || b.id::text,
        'Cobro marcado como vencido',
        'Hay un apunte comercial cuya fecha de vencimiento ya ha pasado. Contacta con Mágina Olivo para revisar el estado; este aviso no acredita una deuda bancaria ni genera factura fiscal.',
        '/anunciante'
      from advertising_billing_entries b
      join advertising_commercial_contracts c on c.id = b.contract_id
      where b.status in ('pending', 'issued', 'overdue')
        and b.due_at is not null
        and b.due_at <= now()
    ), inserted as (
      insert into advertiser_notifications (
        id, advertiser_id, target_user_id, notification_type, severity,
        event_key, title, body, action_url, email_eligible
      )
      select
        md5('advertiser-notification:' || event_key)::uuid,
        advertiser_id,
        null,
        notification_type,
        severity,
        event_key,
        title,
        body,
        action_url,
        true
      from candidates
      on conflict (event_key) do nothing
      returning id
    )
    select count(*)::int as inserted from inserted
  `);
  return result.rows[0]?.inserted ?? 0;
}

async function queueEmailDeliveries(pool: Pool): Promise<number> {
  if (mailTransport() === 'disabled') return 0;
  const result = await pool.query<{ inserted: number }>(`
    with inserted as (
      insert into advertiser_notification_email_deliveries (
        id, notification_id, user_id, status
      )
      select
        md5('advertiser-email:' || n.id::text || ':' || m.user_id)::uuid,
        n.id,
        m.user_id,
        'pending'
      from advertiser_notifications n
      join advertiser_portal_memberships m
        on m.advertiser_id = n.advertiser_id and m.status = 'active'
      join advertiser_notification_preferences p
        on p.advertiser_id = n.advertiser_id
       and p.user_id = m.user_id
       and p.email_enabled = true
      where n.email_eligible = true
        and n.created_at >= now() - interval '7 days'
        and (n.target_user_id is null or n.target_user_id = m.user_id)
      on conflict (notification_id, user_id) do nothing
      returning id
    )
    select count(*)::int as inserted from inserted
  `);
  return result.rows[0]?.inserted ?? 0;
}

async function sendWithResend(delivery: PendingDelivery): Promise<void> {
  const apiKey = requiredEnvironment('RESEND_API_KEY');
  const from = requiredEnvironment('COMMERCIAL_MAIL_FROM');
  const baseUrl = (process.env.BETTER_AUTH_URL ?? 'http://localhost:5173').replace(/\/$/, '');
  const actionUrl = delivery.action_url?.startsWith('/') ? `${baseUrl}${delivery.action_url}` : baseUrl;
  const idempotencyKey = `advertiser-${createHash('sha256').update(`${delivery.notification_id}:${delivery.user_id}`).digest('hex')}`;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    signal: AbortSignal.timeout(10_000),
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
      'idempotency-key': idempotencyKey,
      'user-agent': 'magina-olivo-worker/1.0',
    },
    body: JSON.stringify({
      from,
      to: [delivery.email],
      subject: `${delivery.title} — Mágina Olivo`,
      text: [
        delivery.body,
        '',
        `Abrir Área del Anunciante: ${actionUrl}`,
        '',
        'Este es un aviso comercial de Mágina Olivo. No es una alerta agrícola, meteorológica ni de emergencia.',
      ].join('\n'),
    }),
  });
  if (!response.ok) throw new Error(`Resend returned HTTP ${response.status}`);
}

async function deliverPendingEmails(pool: Pool): Promise<{ sent: number; failed: number }> {
  if (mailTransport() === 'disabled') return { sent: 0, failed: 0 };

  const result = await pool.query<PendingDelivery>(`
    select d.id, d.notification_id, d.user_id,
      coalesce(to_jsonb(u)->>'email', '') as email,
      n.title, n.body, n.action_url
    from advertiser_notification_email_deliveries d
    join advertiser_notifications n on n.id = d.notification_id
    left join "user" u on coalesce(to_jsonb(u)->>'id', '') = d.user_id
    where d.status in ('pending', 'failed')
      and d.attempts < 3
    order by d.created_at
    limit 20
  `);

  let sent = 0;
  let failed = 0;
  for (const delivery of result.rows) {
    if (!delivery.email || !delivery.email.includes('@')) {
      await pool.query(`
        update advertiser_notification_email_deliveries
        set status = 'skipped', attempts = attempts + 1,
            last_error = 'No deliverable account email', updated_at = now()
        where id = $1
      `, [delivery.id]);
      continue;
    }

    try {
      await sendWithResend(delivery);
      await pool.query(`
        update advertiser_notification_email_deliveries
        set status = 'sent', attempts = attempts + 1, last_error = null,
            sent_at = now(), updated_at = now()
        where id = $1
      `, [delivery.id]);
      sent += 1;
    } catch (error) {
      await pool.query(`
        update advertiser_notification_email_deliveries
        set status = 'failed', attempts = attempts + 1,
            last_error = $2, updated_at = now()
        where id = $1
      `, [delivery.id, (error instanceof Error ? error.message : String(error)).slice(0, 500)]);
      failed += 1;
    }
  }
  return { sent, failed };
}

export async function scanAdvertiserNotifications(pool: Pool): Promise<{
  created: number;
  queuedEmails: number;
  sentEmails: number;
  failedEmails: number;
  mailTransport: MailTransport;
}> {
  const created = await createDueNotifications(pool);
  const queuedEmails = await queueEmailDeliveries(pool);
  const delivered = await deliverPendingEmails(pool);
  return {
    created,
    queuedEmails,
    sentEmails: delivered.sent,
    failedEmails: delivered.failed,
    mailTransport: mailTransport(),
  };
}
