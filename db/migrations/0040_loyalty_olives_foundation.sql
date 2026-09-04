create table loyalty_wallets (
  user_id text primary key,
  status text not null default 'active' check (status in ('active', 'suspended', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column loyalty_wallets.user_id is
  'Authentication-provider user id. Kept as text to match the existing auth boundary.';

create table loyalty_levels (
  id uuid primary key,
  code text not null unique check (length(trim(code)) > 0),
  name text not null check (length(trim(name)) > 0),
  min_lifetime_earned bigint not null check (min_lifetime_earned >= 0),
  sort_order integer not null check (sort_order >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (min_lifetime_earned)
);

create index loyalty_levels_active_idx
  on loyalty_levels(active, sort_order, min_lifetime_earned);

create table loyalty_rules (
  id uuid primary key,
  event_type text not null check (length(trim(event_type)) > 0),
  name text not null check (length(trim(name)) > 0),
  olives bigint not null check (olives > 0),
  target_bucket text not null default 'pending' check (target_bucket in ('pending')),
  active boolean not null default true,
  per_user_lifetime_limit integer check (per_user_lifetime_limit is null or per_user_lifetime_limit > 0),
  cooldown_seconds integer check (cooldown_seconds is null or cooldown_seconds >= 0),
  starts_at timestamptz,
  ends_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at >= starts_at)
);

create index loyalty_rules_event_active_idx
  on loyalty_rules(event_type, active, starts_at, ends_at);

create table loyalty_reward_events (
  id uuid primary key,
  user_id text not null references loyalty_wallets(user_id) on delete restrict,
  rule_id uuid references loyalty_rules(id) on delete set null,
  event_type text not null check (length(trim(event_type)) > 0),
  source_type text,
  source_id text,
  idempotency_key text not null,
  status text not null default 'accepted' check (status in ('accepted', 'rejected', 'reversed')),
  occurred_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, idempotency_key)
);

create index loyalty_reward_events_user_date_idx
  on loyalty_reward_events(user_id, occurred_at desc);

create index loyalty_reward_events_rule_idx
  on loyalty_reward_events(rule_id, status, occurred_at desc)
  where rule_id is not null;

create table loyalty_transactions (
  id uuid primary key,
  user_id text not null references loyalty_wallets(user_id) on delete restrict,
  reward_event_id uuid references loyalty_reward_events(id) on delete restrict,
  kind text not null check (kind in ('earn', 'collect', 'redeem', 'expire', 'reverse', 'adjustment')),
  pending_delta bigint not null default 0,
  available_delta bigint not null default 0,
  lifetime_earned_delta bigint not null default 0,
  related_transaction_id uuid references loyalty_transactions(id) on delete restrict,
  reference_type text,
  reference_id text,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (pending_delta <> 0 or available_delta <> 0 or lifetime_earned_delta <> 0),
  check (lifetime_earned_delta >= 0 or kind in ('reverse', 'adjustment')),
  check (
    kind <> 'collect'
    or (
      pending_delta < 0
      and available_delta > 0
      and lifetime_earned_delta = 0
      and abs(pending_delta) = available_delta
    )
  )
);

create index loyalty_transactions_user_date_idx
  on loyalty_transactions(user_id, created_at desc);

create index loyalty_transactions_event_idx
  on loyalty_transactions(reward_event_id)
  where reward_event_id is not null;

create unique index loyalty_transactions_one_earn_per_event_uq
  on loyalty_transactions(reward_event_id)
  where kind = 'earn' and reward_event_id is not null;

create view loyalty_wallet_balances as
select
  w.user_id,
  w.status,
  coalesce(sum(t.pending_delta), 0)::bigint as pending_balance,
  coalesce(sum(t.available_delta), 0)::bigint as available_balance,
  coalesce(sum(t.lifetime_earned_delta), 0)::bigint as lifetime_earned,
  w.created_at,
  w.updated_at
from loyalty_wallets w
left join loyalty_transactions t on t.user_id = w.user_id
group by w.user_id, w.status, w.created_at, w.updated_at;

comment on view loyalty_wallet_balances is
  'Authoritative loyalty balances derived from immutable ledger deltas. pending_balance is collected visually in Tu Olivo before becoming available_balance.';

insert into loyalty_levels (id, code, name, min_lifetime_earned, sort_order)
values
  ('11000000-0000-0000-0000-000000000001', 'brote', 'Brote', 0, 10),
  ('11000000-0000-0000-0000-000000000002', 'olivo', 'Olivo', 500, 20),
  ('11000000-0000-0000-0000-000000000003', 'olivo_maduro', 'Olivo Maduro', 1500, 30),
  ('11000000-0000-0000-0000-000000000004', 'olivo_centenario', 'Olivo Centenario', 5000, 40);

insert into loyalty_rules (
  id,
  event_type,
  name,
  olives,
  per_user_lifetime_limit,
  cooldown_seconds
)
values
  ('11100000-0000-0000-0000-000000000001', 'account.created', 'Crear cuenta', 100, 1, null),
  ('11100000-0000-0000-0000-000000000002', 'profile.completed', 'Completar perfil', 75, 1, null),
  ('11100000-0000-0000-0000-000000000003', 'parcel.first_created', 'Registrar primera parcela', 150, 1, null),
  ('11100000-0000-0000-0000-000000000004', 'parcel.completed', 'Completar datos de parcela', 75, null, null),
  ('11100000-0000-0000-0000-000000000005', 'harvest.first_created', 'Registrar primera cosecha', 100, 1, null),
  ('11100000-0000-0000-0000-000000000006', 'yield.recorded', 'Añadir rendimiento', 50, null, null),
  ('11100000-0000-0000-0000-000000000007', 'campaign.completed', 'Completar campaña', 250, null, null),
  ('11100000-0000-0000-0000-000000000008', 'referral.validated', 'Referido validado', 300, null, null);
