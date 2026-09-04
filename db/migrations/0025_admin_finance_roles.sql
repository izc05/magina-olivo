create table if not exists platform_admin_memberships (
  user_id text not null,
  role text not null
    check (role in ('superadmin', 'commercial', 'content', 'support', 'operations')),
  status text not null default 'active'
    check (status in ('active', 'revoked')),
  created_by_user_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, role)
);

create index if not exists platform_admin_memberships_status_idx
  on platform_admin_memberships(status, role, user_id);

create table if not exists advertising_plan_pricing (
  plan_code text primary key references advertising_plans(code) on delete cascade,
  amount_cents integer check (amount_cents is null or amount_cents >= 0),
  billing_cycle text not null default 'monthly'
    check (billing_cycle in ('one_off', 'monthly', 'quarterly', 'yearly')),
  notes text,
  updated_by_user_id text,
  updated_at timestamptz not null default now()
);

insert into advertising_plan_pricing (plan_code, amount_cents, billing_cycle, notes)
select code, null, 'monthly', 'Precio comercial pendiente de definir.'
from advertising_plans
on conflict (plan_code) do nothing;

create table if not exists advertising_commercial_contracts (
  id uuid primary key,
  advertiser_id uuid not null references advertiser_profiles(id) on delete cascade,
  sponsorship_id uuid references sponsorships(id) on delete set null,
  plan_code text not null references advertising_plans(code),
  agreed_amount_cents integer not null check (agreed_amount_cents >= 0),
  currency char(3) not null default 'EUR',
  billing_cycle text not null
    check (billing_cycle in ('one_off', 'monthly', 'quarterly', 'yearly')),
  status text not null default 'draft'
    check (status in ('draft', 'active', 'paused', 'completed', 'cancelled')),
  starts_at timestamptz,
  ends_at timestamptz,
  renewal_at timestamptz,
  external_reference text,
  notes text,
  created_by_user_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create index if not exists advertising_commercial_contracts_status_idx
  on advertising_commercial_contracts(status, renewal_at, ends_at);

create index if not exists advertising_commercial_contracts_advertiser_idx
  on advertising_commercial_contracts(advertiser_id, status);

create table if not exists advertising_billing_entries (
  id uuid primary key,
  contract_id uuid not null references advertising_commercial_contracts(id) on delete cascade,
  amount_cents integer not null check (amount_cents >= 0),
  currency char(3) not null default 'EUR',
  status text not null default 'pending'
    check (status in ('pending', 'issued', 'paid', 'overdue', 'cancelled', 'refunded')),
  due_at timestamptz,
  paid_at timestamptz,
  payment_method text
    check (payment_method is null or payment_method in ('manual', 'bank_transfer', 'bizum', 'card', 'other')),
  reference text,
  notes text,
  created_by_user_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status <> 'paid' or paid_at is not null)
);

create index if not exists advertising_billing_entries_status_idx
  on advertising_billing_entries(status, due_at, created_at desc);

comment on table platform_admin_memberships is
  'Persisted delegated platform roles. MAGINA_ADMIN_EMAILS remains the emergency/bootstrap superadmin allowlist.';

comment on table advertising_plan_pricing is
  'Optional commercial defaults only. No plan price is hard-coded by migration; null means price not yet defined.';

comment on table advertising_billing_entries is
  'Internal billing control. Recording a paid entry does not execute or prove a payment transaction and does not generate a tax invoice.';
