create or replace function loyalty_expire_redemptions(
  p_user_id text default null,
  p_limit integer default 100
)
returns table (
  redemption_id uuid,
  refunded_olives bigint
)
language plpgsql
as $$
declare
  redemption record;
  debit_id uuid;
  reverse_rows integer;
begin
  for redemption in
    select
      rd.id,
      rd.user_id,
      rd.reward_id,
      rd.pickup_point_id,
      rd.olives_cost,
      r.partner_id,
      r.code as reward_code
    from loyalty_redemptions rd
    join loyalty_rewards r on r.id = rd.reward_id
    where rd.status in ('reserved', 'issued')
      and rd.expires_at <= now()
      and (p_user_id is null or rd.user_id = p_user_id)
    order by rd.expires_at asc, rd.id asc
    limit greatest(1, least(coalesce(p_limit, 100), 500))
    for update of rd skip locked
  loop
    update loyalty_redemptions
    set status = 'expired',
        cancellation_reason = 'reservation_ttl_elapsed',
        updated_at = now()
    where id = redemption.id
      and status in ('reserved', 'issued');

    if not found then
      continue;
    end if;

    update loyalty_redemption_tokens
    set status = 'expired'
    where redemption_id = redemption.id
      and status = 'active';

    update loyalty_reward_stock
    set reserved_units = greatest(reserved_units - 1, 0),
        updated_at = now()
    where reward_id = redemption.reward_id;

    select t.id
    into debit_id
    from loyalty_transactions t
    where t.user_id = redemption.user_id
      and t.kind = 'redeem'
      and t.reference_type = 'loyalty_redemption'
      and t.reference_id = redemption.id::text
    order by t.created_at asc
    limit 1;

    insert into loyalty_transactions (
      id,
      user_id,
      kind,
      pending_delta,
      available_delta,
      lifetime_earned_delta,
      related_transaction_id,
      reference_type,
      reference_id,
      reason,
      metadata
    )
    values (
      md5(redemption.id::text || ':expiry-reverse')::uuid,
      redemption.user_id,
      'reverse',
      0,
      redemption.olives_cost,
      0,
      debit_id,
      'loyalty_redemption',
      redemption.id::text,
      'Devolución automática por canje caducado',
      jsonb_build_object(
        'reward_code', redemption.reward_code,
        'source', 'redemption_expiry'
      )
    )
    on conflict do nothing;

    get diagnostics reverse_rows = row_count;

    insert into loyalty_redemption_validation_events (
      id,
      redemption_id,
      partner_id,
      pickup_point_id,
      validator_user_id,
      outcome,
      reason,
      metadata
    )
    values (
      md5(redemption.id::text || ':expiry-event')::uuid,
      redemption.id,
      redemption.partner_id,
      redemption.pickup_point_id,
      null,
      'expired',
      'reservation_ttl_elapsed',
      jsonb_build_object(
        'olives_refunded', case when reverse_rows = 1 then redemption.olives_cost else 0 end,
        'source', 'loyalty_expire_redemptions'
      )
    )
    on conflict do nothing;

    redemption_id := redemption.id;
    refunded_olives := case when reverse_rows = 1 then redemption.olives_cost else 0 end;
    return next;
  end loop;
end;
$$;

comment on function loyalty_expire_redemptions(text, integer) is
  'Expires reserved/issued reward redemptions whose TTL elapsed, releases reserved stock and refunds olives exactly once. Safe for concurrent workers through row locks plus ledger uniqueness.';
