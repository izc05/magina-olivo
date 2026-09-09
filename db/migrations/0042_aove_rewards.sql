create table reward_partners (
  id uuid primary key,
  cooperative_id uuid references cooperatives(id) on delete set null,
  name text not null check (length(trim(name)) > 0),
  partner_type text not null default 'cooperative'
    check (partner_type in ('cooperative', 'almazara', 'business', 'institution', 'magina_olivo')),
  status text not null default 'active'
    check (status in ('draft', 'active', 'paused', 'archived')),
  website_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index reward_partners_cooperative_uq
  on reward_partners(cooperative_id)
  where cooperative_id is not null;

create index reward_partners_status_idx
  on reward_partners(status, partner_type, name);

create table reward_pickup_points (
  id uuid primary key,
  partner_id uuid not null references reward_partners(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  address text not null check (length(trim(address)) > 0),
  municipality text,
  province text,
  instructions text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index reward_pickup_points_partner_idx
  on reward_pickup_points(partner_id, active);

create table loyalty_rewards (
  id uuid primary key,
  partner_id uuid references reward_partners(id) on delete set null,
  code text not null unique check (length(trim(code)) > 0),
  title text not null check (length(trim(title)) > 0),
  description text,
  reward_type text not null default 'aove_bottle'
    check (reward_type in ('aove_bottle', 'aove_pack', 'discount', 'experience', 'internal_feature', 'other')),
  product_format text,
  cost_olives bigint not null check (cost_olives > 0),
  max_per_user integer check (max_per_user is null or max_per_user > 0),
  pickup_required boolean not null default true,
  status text not null default 'draft'
    check (status in ('draft', 'active', 'paused', 'ended', 'archived')),
  starts_at timestamptz,
  ends_at timestamptz,
  redemption_ttl_hours integer not null default 336 check (redemption_ttl_hours between 1 and 8760),
  terms_summary text,
  image_url text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at >= starts_at)
);

create index loyalty_rewards_catalog_idx
  on loyalty_rewards(status, starts_at, ends_at, cost_olives);

create index loyalty_rewards_partner_idx
  on loyalty_rewards(partner_id, status);

create table loyalty_reward_pickup_points (
  reward_id uuid not null references loyalty_rewards(id) on delete cascade,
  pickup_point_id uuid not null references reward_pickup_points(id) on delete cascade,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (reward_id, pickup_point_id)
);

create table loyalty_reward_stock (
  reward_id uuid primary key references loyalty_rewards(id) on delete cascade,
  total_units integer not null check (total_units >= 0),
  reserved_units integer not null default 0 check (reserved_units >= 0),
  redeemed_units integer not null default 0 check (redeemed_units >= 0),
  updated_at timestamptz not null default now(),
  check (reserved_units + redeemed_units <= total_units)
);

comment on table loyalty_reward_stock is
  'Counter row locked during redemption. Available stock = total_units - reserved_units - redeemed_units.';

create table loyalty_redemptions (
  id uuid primary key,
  user_id text not null references loyalty_wallets(user_id) on delete restrict,
  reward_id uuid not null references loyalty_rewards(id) on delete restrict,
  pickup_point_id uuid references reward_pickup_points(id) on delete restrict,
  status text not null default 'reserved'
    check (status in ('reserved', 'issued', 'redeemed', 'expired', 'cancelled')),
  olives_cost bigint not null check (olives_cost > 0),
  idempotency_key text not null,
  reserved_at timestamptz not null default now(),
  expires_at timestamptz not null,
  issued_at timestamptz,
  redeemed_at timestamptz,
  cancelled_at timestamptz,
  validated_by_user_id text,
  cancellation_reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, idempotency_key),
  check (expires_at > reserved_at)
);

create index loyalty_redemptions_user_idx
  on loyalty_redemptions(user_id, created_at desc);

create index loyalty_redemptions_reward_status_idx
  on loyalty_redemptions(reward_id, status, created_at desc);

create index loyalty_redemptions_expiry_idx
  on loyalty_redemptions(status, expires_at)
  where status in ('reserved', 'issued');

create table loyalty_redemption_tokens (
  id uuid primary key,
  redemption_id uuid not null unique references loyalty_redemptions(id) on delete cascade,
  token_hash char(64) not null unique,
  token_hint varchar(12) not null,
  status text not null default 'active'
    check (status in ('active', 'redeemed', 'revoked', 'expired')),
  expires_at timestamptz not null,
  redeemed_at timestamptz,
  created_at timestamptz not null default now()
);

create index loyalty_redemption_tokens_active_idx
  on loyalty_redemption_tokens(status, expires_at)
  where status = 'active';

create unique index loyalty_transactions_one_redemption_debit_uq
  on loyalty_transactions(user_id, reference_id)
  where kind = 'redeem'
    and reference_type = 'loyalty_redemption'
    and reference_id is not null;

comment on table loyalty_redemption_tokens is
  'Stores only SHA-256 token hashes. The raw QR bearer token is returned once to the user and is never persisted.';
