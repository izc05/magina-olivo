import { createHash, randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';
import { getPool } from './db.ts';

export class RewardPartnerServiceError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

type ExpirableRedemption = {
  id: string;
  user_id: string;
  reward_id: string;
  pickup_point_id: string | null;
  olives_cost: string | number;
  partner_id: string | null;
  reward_code: string;
};

type TokenRedemptionRow = ExpirableRedemption & {
  token_id: string;
  token_status: string;
  token_expires_at: Date | string;
  redemption_status: string;
  redemption_expires_at: Date | string;
  reward_title: string;
  pickup_required: boolean;
  reward_partner_id: string | null;
  pickup_partner_id: string | null;
  pickup_name: string | null;
  pickup_address: string | null;
  partner_name: string | null;
};

function hashToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

function isExpired(value: Date | string): boolean {
  return new Date(value).getTime() <= Date.now();
}

async function expireLockedRedemption(
  client: PoolClient,
  row: ExpirableRedemption,
  reason: string,
): Promise<boolean> {
  const expired = await client.query(
    `update loyalty_redemptions
     set status = 'expired',
         cancellation_reason = $2,
         updated_at = now()
     where id = $1
       and status in ('reserved', 'issued')`,
    [row.id, reason],
  );

  if (expired.rowCount !== 1) return false;

  await client.query(
    `update loyalty_redemption_tokens
     set status = 'expired'
     where redemption_id = $1
       and status = 'active'`,
    [row.id],
  );

  await client.query(
    `update loyalty_reward_stock
     set reserved_units = greatest(reserved_units - 1, 0),
         updated_at = now()
     where reward_id = $1`,
    [row.reward_id],
  );

  const debit = (
    await client.query<{ id: string }>(
      `select id
       from loyalty_transactions
       where user_id = $1
         and kind = 'redeem'
         and reference_type = 'loyalty_redemption'
         and reference_id = $2
       order by created_at asc
       limit 1`,
      [row.user_id, row.id],
    )
  ).rows[0];

  await client.query(
    `insert into loyalty_transactions (
       id, user_id, kind, pending_delta, available_delta,
       lifetime_earned_delta, related_transaction_id,
       reference_type, reference_id, reason, metadata
     )
     select $1, $2, 'reverse', 0, $3, 0, $4,
            'loyalty_redemption', $5, $6,
            jsonb_build_object('reward_code', $7, 'source', 'redemption_expiry')
     where not exists (
       select 1
       from loyalty_transactions
       where user_id = $2
         and kind = 'reverse'
         and reference_type = 'loyalty_redemption'
         and reference_id = $5
     )`,
    [
      randomUUID(),
      row.user_id,
      Number(row.olives_cost),
      debit?.id ?? null,
      row.id,
      'Devolución automática por canje caducado',
      row.reward_code,
    ],
  );

  await client.query(
    `insert into loyalty_redemption_validation_events (
       id, redemption_id, partner_id, pickup_point_id,
       validator_user_id, outcome, reason, metadata
     )
     values ($1, $2, $3, $4, null, 'expired', $5,
             jsonb_build_object('olives_refunded', $6))`,
    [
      randomUUID(),
      row.id,
      row.partner_id,
      row.pickup_point_id,
      reason,
      Number(row.olives_cost),
    ],
  );

  return true;
}

export async function expireRewardRedemptionsForUser(userId: string): Promise<number> {
  const client = await getPool().connect();
  try {
    await client.query('begin');
    const rows = (
      await client.query<ExpirableRedemption>(
        `select
           rd.id,
           rd.user_id,
           rd.reward_id,
           rd.pickup_point_id,
           rd.olives_cost,
           r.partner_id,
           r.code as reward_code
         from loyalty_redemptions rd
         join loyalty_rewards r on r.id = rd.reward_id
         where rd.user_id = $1
           and rd.status in ('reserved', 'issued')
           and rd.expires_at <= now()
         order by rd.expires_at asc
         limit 50
         for update of rd skip locked`,
        [userId],
      )
    ).rows;

    let count = 0;
    for (const row of rows) {
      if (await expireLockedRedemption(client, row, 'reservation_ttl_elapsed')) count += 1;
    }

    await client.query('commit');
    return count;
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

export async function expireRewardRedemptionsBatch(limit = 100): Promise<number> {
  const safeLimit = Math.max(1, Math.min(500, Math.trunc(limit)));
  const client = await getPool().connect();
  try {
    await client.query('begin');
    const rows = (
      await client.query<ExpirableRedemption>(
        `select
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
         order by rd.expires_at asc
         limit $1
         for update of rd skip locked`,
        [safeLimit],
      )
    ).rows;

    let count = 0;
    for (const row of rows) {
      if (await expireLockedRedemption(client, row, 'reservation_ttl_elapsed')) count += 1;
    }

    await client.query('commit');
    return count;
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

export async function listRewardValidatorContext(userId: string): Promise<Array<{
  partnerId: string;
  partnerName: string;
  role: string;
  pickupPoints: Array<{ id: string; name: string; address: string }>;
}>> {
  const rows = (
    await getPool().query<{
      partner_id: string;
      partner_name: string;
      role: string;
      pickup_point_id: string | null;
      pickup_name: string | null;
      pickup_address: string | null;
    }>(
      `select
         m.partner_id,
         p.name as partner_name,
         m.role,
         pp.id as pickup_point_id,
         pp.name as pickup_name,
         pp.address as pickup_address
       from reward_partner_members m
       join reward_partners p on p.id = m.partner_id
       left join reward_pickup_points pp
         on pp.partner_id = p.id and pp.active = true
       where m.user_id = $1
         and m.status = 'active'
         and p.status = 'active'
       order by p.name, pp.name`,
      [userId],
    )
  ).rows;

  const partners = new Map<string, {
    partnerId: string;
    partnerName: string;
    role: string;
    pickupPoints: Array<{ id: string; name: string; address: string }>;
  }>();

  for (const row of rows) {
    let partner = partners.get(row.partner_id);
    if (!partner) {
      partner = {
        partnerId: row.partner_id,
        partnerName: row.partner_name,
        role: row.role,
        pickupPoints: [],
      };
      partners.set(row.partner_id, partner);
    }
    if (row.pickup_point_id && row.pickup_name && row.pickup_address) {
      partner.pickupPoints.push({
        id: row.pickup_point_id,
        name: row.pickup_name,
        address: row.pickup_address,
      });
    }
  }

  return [...partners.values()];
}

export async function validateRewardToken(input: {
  validatorUserId: string;
  token: string;
}): Promise<{
  outcome: 'redeemed' | 'expired';
  redemptionId: string;
  rewardCode: string;
  rewardTitle: string;
  partnerName: string | null;
  pickupPoint: { id: string; name: string; address: string } | null;
  olivesCost: number;
  redeemedAt: string | null;
  olivesRefunded: number;
}> {
  const token = input.token.trim();
  if (token.length < 16 || token.length > 512) {
    throw new RewardPartnerServiceError('REWARD_TOKEN_INVALID', 'Código de recogida no válido', 400);
  }

  const client = await getPool().connect();
  try {
    await client.query('begin');

    const row = (
      await client.query<TokenRedemptionRow>(
        `select
           rt.id as token_id,
           rt.status as token_status,
           rt.expires_at as token_expires_at,
           rd.id,
           rd.user_id,
           rd.reward_id,
           rd.pickup_point_id,
           rd.olives_cost,
           rd.status as redemption_status,
           rd.expires_at as redemption_expires_at,
           r.code as reward_code,
           r.title as reward_title,
           r.pickup_required,
           r.partner_id as reward_partner_id,
           pp.partner_id as pickup_partner_id,
           pp.name as pickup_name,
           pp.address as pickup_address,
           rp.name as partner_name,
           coalesce(pp.partner_id, r.partner_id) as partner_id
         from loyalty_redemption_tokens rt
         join loyalty_redemptions rd on rd.id = rt.redemption_id
         join loyalty_rewards r on r.id = rd.reward_id
         join loyalty_reward_stock s on s.reward_id = r.id
         left join reward_pickup_points pp on pp.id = rd.pickup_point_id
         left join reward_partners rp on rp.id = coalesce(pp.partner_id, r.partner_id)
         where rt.token_hash = $1
         for update of rt, rd, s`,
        [hashToken(token)],
      )
    ).rows[0];

    if (!row || !row.partner_id) {
      throw new RewardPartnerServiceError('REWARD_TOKEN_INVALID', 'Código de recogida no válido', 404);
    }

    if (row.reward_partner_id && row.pickup_partner_id && row.reward_partner_id !== row.pickup_partner_id) {
      throw new RewardPartnerServiceError(
        'REWARD_PARTNER_CONFIGURATION_INVALID',
        'La recompensa y el punto de recogida pertenecen a partners distintos',
        409,
      );
    }

    const access = (
      await client.query<{ role: string }>(
        `select m.role
         from reward_partner_members m
         join reward_partners p on p.id = m.partner_id
         where m.user_id = $1
           and m.partner_id = $2
           and m.status = 'active'
           and p.status = 'active'
         limit 1`,
        [input.validatorUserId, row.partner_id],
      )
    ).rows[0];

    if (!access) {
      throw new RewardPartnerServiceError(
        'REWARD_VALIDATOR_FORBIDDEN',
        'No tienes permiso para validar recompensas de este punto',
        403,
      );
    }

    if (row.token_status === 'redeemed' || row.redemption_status === 'redeemed') {
      throw new RewardPartnerServiceError('REWARD_ALREADY_REDEEMED', 'Este código ya fue utilizado', 409);
    }
    if (row.token_status === 'revoked') {
      throw new RewardPartnerServiceError('REWARD_TOKEN_REVOKED', 'Este código fue sustituido por uno nuevo', 409);
    }

    if (
      row.token_status === 'expired'
      || row.redemption_status === 'expired'
      || isExpired(row.token_expires_at)
      || isExpired(row.redemption_expires_at)
    ) {
      const refunded = await expireLockedRedemption(client, row, 'validation_detected_expiry');
      await client.query('commit');
      return {
        outcome: 'expired',
        redemptionId: row.id,
        rewardCode: row.reward_code,
        rewardTitle: row.reward_title,
        partnerName: row.partner_name,
        pickupPoint: row.pickup_point_id && row.pickup_name && row.pickup_address
          ? { id: row.pickup_point_id, name: row.pickup_name, address: row.pickup_address }
          : null,
        olivesCost: Number(row.olives_cost),
        redeemedAt: null,
        olivesRefunded: refunded ? Number(row.olives_cost) : 0,
      };
    }

    if (!['reserved', 'issued'].includes(row.redemption_status) || row.token_status !== 'active') {
      throw new RewardPartnerServiceError('REWARD_TOKEN_NOT_ACTIVE', 'Este código ya no está activo', 409);
    }
    if (row.pickup_required && !row.pickup_point_id) {
      throw new RewardPartnerServiceError(
        'REWARD_PICKUP_POINT_MISSING',
        'El canje no tiene un punto de recogida válido',
        409,
      );
    }

    const stock = await client.query(
      `update loyalty_reward_stock
       set reserved_units = reserved_units - 1,
           redeemed_units = redeemed_units + 1,
           updated_at = now()
       where reward_id = $1
         and reserved_units > 0`,
      [row.reward_id],
    );
    if (stock.rowCount !== 1) {
      throw new RewardPartnerServiceError(
        'REWARD_STOCK_INCONSISTENT',
        'El stock reservado no coincide con el canje',
        409,
      );
    }

    const redeemedAt = new Date();
    await client.query(
      `update loyalty_redemptions
       set status = 'redeemed',
           redeemed_at = $2,
           validated_by_user_id = $3,
           updated_at = now()
       where id = $1`,
      [row.id, redeemedAt, input.validatorUserId],
    );

    await client.query(
      `update loyalty_redemption_tokens
       set status = 'redeemed',
           redeemed_at = $2
       where id = $1`,
      [row.token_id, redeemedAt],
    );

    await client.query(
      `insert into loyalty_redemption_validation_events (
         id, redemption_id, partner_id, pickup_point_id,
         validator_user_id, outcome, reason, metadata
       )
       values ($1, $2, $3, $4, $5, 'redeemed', 'partner_confirmed_delivery',
               jsonb_build_object('validator_role', $6))`,
      [
        randomUUID(),
        row.id,
        row.partner_id,
        row.pickup_point_id,
        input.validatorUserId,
        access.role,
      ],
    );

    await client.query('commit');

    return {
      outcome: 'redeemed',
      redemptionId: row.id,
      rewardCode: row.reward_code,
      rewardTitle: row.reward_title,
      partnerName: row.partner_name,
      pickupPoint: row.pickup_point_id && row.pickup_name && row.pickup_address
        ? { id: row.pickup_point_id, name: row.pickup_name, address: row.pickup_address }
        : null,
      olivesCost: Number(row.olives_cost),
      redeemedAt: redeemedAt.toISOString(),
      olivesRefunded: 0,
    };
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}
