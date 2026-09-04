alter table loyalty_redemption_tokens
  drop constraint if exists loyalty_redemption_tokens_redemption_id_key;

create unique index loyalty_redemption_tokens_one_active_per_redemption_uq
  on loyalty_redemption_tokens(redemption_id)
  where status = 'active';

create table reward_partner_members (
  id uuid primary key,
  partner_id uuid not null references reward_partners(id) on delete cascade,
  user_id text not null,
  role text not null default 'validator'
    check (role in ('owner', 'manager', 'validator')),
  status text not null default 'active'
    check (status in ('invited', 'active', 'suspended', 'revoked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (partner_id, user_id)
);

create index reward_partner_members_user_idx
  on reward_partner_members(user_id, status, partner_id);

create index reward_partner_members_partner_idx
  on reward_partner_members(partner_id, status, role);

comment on table reward_partner_members is
  'Reward-partner permissions are intentionally separate from agricultural holding memberships.';

create table loyalty_redemption_validation_events (
  id uuid primary key,
  redemption_id uuid not null references loyalty_redemptions(id) on delete cascade,
  partner_id uuid references reward_partners(id) on delete set null,
  pickup_point_id uuid references reward_pickup_points(id) on delete set null,
  validator_user_id text,
  outcome text not null
    check (outcome in ('redeemed', 'rejected', 'expired', 'refunded')),
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index loyalty_redemption_validation_events_redemption_idx
  on loyalty_redemption_validation_events(redemption_id, created_at desc);

create index loyalty_redemption_validation_events_partner_idx
  on loyalty_redemption_validation_events(partner_id, created_at desc)
  where partner_id is not null;

create unique index loyalty_transactions_one_redemption_reverse_uq
  on loyalty_transactions(user_id, reference_id)
  where kind = 'reverse'
    and reference_type = 'loyalty_redemption'
    and reference_id is not null;
