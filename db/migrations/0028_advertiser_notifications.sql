create table if not exists advertiser_notifications (
  id uuid primary key,
  advertiser_id uuid not null references advertiser_profiles(id) on delete cascade,
  target_user_id text,
  notification_type text not null
    check (notification_type in (
      'application_approved',
      'profile_change_approved',
      'profile_change_rejected',
      'campaign_ending',
      'renewal_due',
      'billing_due',
      'billing_overdue'
    )),
  severity text not null default 'info'
    check (severity in ('info', 'action', 'warning')),
  event_key text not null unique,
  title text not null,
  body text not null,
  action_url text,
  email_eligible boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists advertiser_notifications_lookup_idx
  on advertiser_notifications(advertiser_id, created_at desc);

create table if not exists advertiser_notification_reads (
  notification_id uuid not null references advertiser_notifications(id) on delete cascade,
  user_id text not null,
  read_at timestamptz not null default now(),
  primary key (notification_id, user_id)
);

create table if not exists advertiser_notification_preferences (
  advertiser_id uuid not null references advertiser_profiles(id) on delete cascade,
  user_id text not null,
  email_enabled boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (advertiser_id, user_id)
);

create table if not exists advertiser_notification_email_deliveries (
  id uuid primary key,
  notification_id uuid not null references advertiser_notifications(id) on delete cascade,
  user_id text not null,
  status text not null default 'pending'
    check (status in ('pending', 'sent', 'skipped', 'failed')),
  attempts integer not null default 0 check (attempts >= 0),
  last_error text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (notification_id, user_id)
);

create index if not exists advertiser_notification_email_delivery_status_idx
  on advertiser_notification_email_deliveries(status, created_at);

create or replace function magina_notify_advertiser_application_approved()
returns trigger
language plpgsql
as $$
begin
  if old.converted_at is null
     and new.converted_at is not null
     and new.converted_advertiser_id is not null then
    insert into advertiser_notifications (
      id, advertiser_id, target_user_id, notification_type, severity,
      event_key, title, body, action_url, email_eligible
    ) values (
      md5('advertiser-application-approved:' || new.id::text)::uuid,
      new.converted_advertiser_id,
      null,
      'application_approved',
      'info',
      'application-approved:' || new.id::text,
      'Alta publicitaria aprobada',
      'Tu solicitud ha sido aprobada y ya existe una campaña en borrador. La publicación sigue siendo un paso independiente.',
      '/anunciante',
      true
    ) on conflict (event_key) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists advertiser_application_approved_notification_trg on advertiser_applications;
create trigger advertiser_application_approved_notification_trg
after update of converted_at on advertiser_applications
for each row execute function magina_notify_advertiser_application_approved();

create or replace function magina_notify_advertiser_profile_change_review()
returns trigger
language plpgsql
as $$
begin
  if old.status = 'pending' and new.status in ('approved', 'rejected') then
    insert into advertiser_notifications (
      id, advertiser_id, target_user_id, notification_type, severity,
      event_key, title, body, action_url, email_eligible
    ) values (
      md5('advertiser-profile-change:' || new.id::text || ':' || new.status)::uuid,
      new.advertiser_id,
      new.submitted_by_user_id,
      case when new.status = 'approved' then 'profile_change_approved' else 'profile_change_rejected' end,
      case when new.status = 'approved' then 'info' else 'action' end,
      'profile-change:' || new.id::text || ':' || new.status,
      case when new.status = 'approved' then 'Cambio de ficha aprobado' else 'Cambio de ficha no aprobado' end,
      case when new.status = 'approved'
        then 'La modificación solicitada ha sido revisada y aplicada a tu ficha comercial.'
        else 'La modificación solicitada ha sido revisada y no se ha aplicado. Consulta el Área del Anunciante para ver el estado.'
      end,
      '/anunciante',
      true
    ) on conflict (event_key) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists advertiser_profile_change_review_notification_trg on advertiser_profile_change_requests;
create trigger advertiser_profile_change_review_notification_trg
after update of status on advertiser_profile_change_requests
for each row execute function magina_notify_advertiser_profile_change_review();

comment on table advertiser_notifications is
  'Commercial advertiser notices only. These notices are separate from agricultural, weather and official emergency alerts.';

comment on table advertiser_notification_preferences is
  'Per-user advertiser email preference. Email is opt-in and disabled by default; in-app notifications remain available.';

comment on table advertiser_notification_email_deliveries is
  'Commercial notification delivery state. COMMERCIAL_MAIL_TRANSPORT defaults to disabled and no provider call occurs unless explicitly configured.';
