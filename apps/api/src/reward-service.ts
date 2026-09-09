import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { getPool } from './db.ts';

export class RewardServiceError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

type RewardRow = {
  id: string;
  code: string;
  title: string;
  description: string | null;
  reward_type: string;
  product_format: string | null;
  cost_olives: string;
  max_per_user: number | null;
  pickup_required: boolean;
  redemption_ttl_hours: number;
  terms_summary: string | null;
  image_url: string | null;
  partner_id: string | null;
  partner_name: string | null;
  total_units: number;
  reserved_units: number;
  redeemed_units: number;
};

type PickupPointRow = {
  id: string;
  name: string;
  address: string;
  municipality: string | null;
  province: string | null;
  instructions: string | null;
};

type RedemptionRow = {
  id: string;
  reward_id: string;
  reward_title: string;
  reward_code: string;
  status: string;
  olives_cost: string;
  expires_at: Date | string;
  reserved_at: Date | string;
  redeemed_at: Date | string | null;
  pickup_point_id: string | null;
  pickup_name: string | null;
  pickup_address: string | null;
  partner_name: string | null;
  token_hint: string | null;
};

export type RewardCatalogItem = {
  id: string;
  code: string;
  title: string;
  description: string | null;
  rewardType: string;
  productFormat: string | null;
  costOlives: number;
  availableUnits: number;
  pickupRequired: boolean;
  termsSummary: string | null;
  imageUrl: string | null;
  partner: { id: string; name: string } | null;
  pickupPoints: Array<{
    id: string;
    name: string;
    address: string;
    municipality: string | null;
    province: string | null;
    instructions: string | null;
  }>;
};

export type RedemptionSummary = {
  id: string;
  rewardId: string;
  rewardCode: string;
  rewardTitle: string;
  status: string;
  olivesCost: number;
  reservedAt: string;
  expiresAt: string;
  redeemedAt: string | null;
  pickupPoint: { id: string; name: string; address: string } | null;
  partnerName: string | null;
  tokenHint: string | null;
};

function toIso(value: Date | string | null): string | null {
  if (value == null) return null;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function hashToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

function newBearerToken(): string {
  return randomBytes(32).toString('base64url');
}

function mapRedemption(row: RedemptionRow): RedemptionSummary {
  return {
    id: row.id,
    rewardId: row.reward_id,
    rewardCode: row.reward_code,
    rewardTitle: row.reward_title,
    status: row.status,
    olivesCost: Number(row.olives_cost),
    reservedAt: toIso(row.reserved_at)!,
    expiresAt: toIso(row.expires_at)!,
    redeemedAt: toIso(row.redeemed_at),
    pickupPoint: row.pickup_point_id && row.pickup_name && row.pickup_address
      ? {
          id: row.pickup_point_id,
          name: row.pickup_name,
          address: row.pickup_address,
        }
      : null,
    partnerName: row.partner_name,
    tokenHint: row.token_hint,
  };
}

async function readRedemption(userId: string, redemptionId: string): Promise<RedemptionSummary | null> {
  const row = (
    await getPool().query<RedemptionRow>(
      `select
         rd.id,
         rd.reward_id,
         r.title as reward_title,
         r.code as reward_code,
         rd.status,
         rd.olives_cost,
         rd.expires_at,
         rd.reserved_at,
         rd.redeemed_at,
         rd.pickup_point_id,
         pp.name as pickup_name,
         pp.address as pickup_address,
         rp.name as partner_name,
         rt.token_hint
       from loyalty_redemptions rd
       join loyalty_rewards r on r.id = rd.reward_id
       left join reward_partners rp on rp.id = r.partner_id
       left join reward_pickup_points pp on pp.id = rd.pickup_point_id
       left join loyalty_redemption_tokens rt on rt.redemption_id = rd.id and rt.status = 'active'
       where rd.user_id = $1 and rd.id = $2
       limit 1`,
      [userId, redemptionId],
    )
  ).rows[0];
  return row ? mapRedemption(row) : null;
}

export async function listRewardCatalog(): Promise<RewardCatalogItem[]> {
  const rewards = (
    await getPool().query<RewardRow>(
      `select
         r.id,
         r.code,
         r.title,
         r.description,
         r.reward_type,
         r.product_format,
         r.cost_olives,
         r.max_per_user,
         r.pickup_required,
         r.redemption_ttl_hours,
         r.terms_summary,
         r.image_url,
         rp.id as partner_id,
         rp.name as partner_name,
         coalesce(s.total_units, 0) as total_units,
         coalesce(s.reserved_units, 0) as reserved_units,
         coalesce(s.redeemed_units, 0) as redeemed_units
       from loyalty_rewards r
       left join reward_partners rp on rp.id = r.partner_id and rp.status = 'active'
       left join loyalty_reward_stock s on s.reward_id = r.id
       where r.status = 'active'
         and (r.starts_at is null or r.starts_at <= now())
         and (r.ends_at is null or r.ends_at >= now())
       order by r.cost_olives asc, r.created_at desc`,
    )
  ).rows;

  if (rewards.length === 0) return [];

  const pickupRows = (
    await getPool().query<PickupPointRow & { reward_id: string }>(
      `select
         link.reward_id,
         pp.id,
         pp.name,
         pp.address,
         pp.municipality,
         pp.province,
         pp.instructions
       from loyalty_reward_pickup_points link
       join reward_pickup_points pp on pp.id = link.pickup_point_id
       where link.active = true and pp.active = true
       order by pp.name`,
    )
  ).rows;

  const pickupByReward = new Map<string, PickupPointRow[]>();
  for (const row of pickupRows) {
    const items = pickupByReward.get(row.reward_id) ?? [];
    items.push(row);
    pickupByReward.set(row.reward_id, items);
  }

  return rewards.map((reward) => ({
    id: reward.id,
    code: reward.code,
    title: reward.title,
    description: reward.description,
    rewardType: reward.reward_type,
    productFormat: reward.product_format,
    costOlives: Number(reward.cost_olives),
    availableUnits: Math.max(0, reward.total_units - reward.reserved_units - reward.redeemed_units),
    pickupRequired: reward.pickup_required,
    termsSummary: reward.terms_summary,
    imageUrl: reward.image_url,
    partner: reward.partner_id && reward.partner_name
      ? { id: reward.partner_id, name: reward.partner_name }
      : null,
    pickupPoints: (pickupByReward.get(reward.id) ?? []).map((point) => ({
      id: point.id,
      name: point.name,
      address: point.address,
      municipality: point.municipality,
      province: point.province,
      instructions: point.instructions,
    })),
  }));
}

export async function listUserRedemptions(userId: string): Promise<RedemptionSummary[]> {
  const rows = (
    await getPool().query<RedemptionRow>(
      `select
         rd.id,
         rd.reward_id,
         r.title as reward_title,
         r.code as reward_code,
         rd.status,
         rd.olives_cost,
         rd.expires_at,
         rd.reserved_at,
         rd.redeemed_at,
         rd.pickup_point_id,
         pp.name as pickup_name,
         pp.address as pickup_address,
         rp.name as partner_name,
         rt.token_hint
       from loyalty_redemptions rd
       join loyalty_rewards r on r.id = rd.reward_id
       left join reward_partners rp on rp.id = r.partner_id
       left join reward_pickup_points pp on pp.id = rd.pickup_point_id
       left join loyalty_redemption_tokens rt on rt.redemption_id = rd.id and rt.status = 'active'
       where rd.user_id = $1
       order by rd.created_at desc`,
      [userId],
    )
  ).rows;
  return rows.map(mapRedemption);
}

export async function redeemReward(input: {
  userId: string;
  rewardId: string;
  pickupPointId?: string | null;
  idempotencyKey: string;
}): Promise<{ redemption: RedemptionSummary; qrToken: string | null; duplicate: boolean }> {
  const client = await getPool().connect();
  try {
    await client.query('begin');

    await client.query(
      `insert into loyalty_wallets (user_id)
       values ($1)
       on conflict (user_id) do nothing`,
      [input.userId],
    );
    await client.query('select user_id from loyalty_wallets where user_id = $1 for update', [input.userId]);

    const duplicate = (
      await client.query<{ id: string }>(
        `select id
         from loyalty_redemptions
         where user_id = $1 and idempotency_key = $2
         limit 1`,
        [input.userId, input.idempotencyKey],
      )
    ).rows[0];

    if (duplicate) {
      await client.query('commit');
      const redemption = await readRedemption(input.userId, duplicate.id);
      if (!redemption) throw new RewardServiceError('REDEMPTION_NOT_FOUND', 'Canje no encontrado', 404);
      return { redemption, qrToken: null, duplicate: true };
    }

    const reward = (
      await client.query<RewardRow>(
        `select
           r.id,
           r.code,
           r.title,
           r.description,
           r.reward_type,
           r.product_format,
           r.cost_olives,
           r.max_per_user,
           r.pickup_required,
           r.redemption_ttl_hours,
           r.terms_summary,
           r.image_url,
           rp.id as partner_id,
           rp.name as partner_name,
           coalesce(s.total_units, 0) as total_units,
           coalesce(s.reserved_units, 0) as reserved_units,
           coalesce(s.redeemed_units, 0) as redeemed_units
         from loyalty_rewards r
         left join reward_partners rp on rp.id = r.partner_id
         join loyalty_reward_stock s on s.reward_id = r.id
         where r.id = $1
           and r.status = 'active'
           and (r.starts_at is null or r.starts_at <= now())
           and (r.ends_at is null or r.ends_at >= now())
         for update of s`,
        [input.rewardId],
      )
    ).rows[0];

    if (!reward) throw new RewardServiceError('REWARD_NOT_AVAILABLE', 'La recompensa no está disponible', 404);

    const availableUnits = reward.total_units - reward.reserved_units - reward.redeemed_units;
    if (availableUnits <= 0) throw new RewardServiceError('REWARD_OUT_OF_STOCK', 'La recompensa está agotada', 409);

    if (reward.pickup_required) {
      if (!input.pickupPointId) {
        throw new RewardServiceError('PICKUP_POINT_REQUIRED', 'Debes elegir un punto de recogida');
      }
      const pickupValid = (
        await client.query<{ valid: boolean }>(
          `select exists (
             select 1
             from loyalty_reward_pickup_points link
             join reward_pickup_points pp on pp.id = link.pickup_point_id
             where link.reward_id = $1
               and link.pickup_point_id = $2
               and link.active = true
               and pp.active = true
           ) as valid`,
          [reward.id, input.pickupPointId],
        )
      ).rows[0]?.valid ?? false;
      if (!pickupValid) throw new RewardServiceError('INVALID_PICKUP_POINT', 'El punto de recogida no es válido');
    }

    if (reward.max_per_user != null) {
      const used = (
        await client.query<{ count: string }>(
          `select count(*)::text as count
           from loyalty_redemptions
           where user_id = $1
             and reward_id = $2
             and status in ('reserved', 'issued', 'redeemed')`,
          [input.userId, reward.id],
        )
      ).rows[0];
      if (Number(used?.count ?? '0') >= reward.max_per_user) {
        throw new RewardServiceError('REWARD_USER_LIMIT', 'Ya has alcanzado el límite de canjes de esta recompensa', 409);
      }
    }

    const balance = (
      await client.query<{ available_balance: string }>(
        `select available_balance
         from loyalty_wallet_balances
         where user_id = $1`,
        [input.userId],
      )
    ).rows[0];
    const availableBalance = Number(balance?.available_balance ?? '0');
    const costOlives = Number(reward.cost_olives);
    if (availableBalance < costOlives) {
      throw new RewardServiceError('INSUFFICIENT_OLIVES', 'No tienes suficientes aceitunas para este canje', 409);
    }

    const redemptionId = randomUUID();
    const expiresAt = new Date(Date.now() + reward.redemption_ttl_hours * 60 * 60 * 1000);
    const qrToken = newBearerToken();
    const tokenHash = hashToken(qrToken);
    const tokenHint = qrToken.slice(-8);

    await client.query(
      `insert into loyalty_redemptions (
         id, user_id, reward_id, pickup_point_id, status, olives_cost,
         idempotency_key, expires_at, issued_at
       )
       values ($1, $2, $3, $4, 'issued', $5, $6, $7, now())`,
      [
        redemptionId,
        input.userId,
        reward.id,
        input.pickupPointId ?? null,
        costOlives,
        input.idempotencyKey,
        expiresAt,
      ],
    );

    await client.query(
      `insert into loyalty_transactions (
         id, user_id, kind, pending_delta, available_delta,
         lifetime_earned_delta, reference_type, reference_id, reason
       )
       values ($1, $2, 'redeem', 0, $3, 0, 'loyalty_redemption', $4, $5)`,
      [randomUUID(), input.userId, -costOlives, redemptionId, `reward:${reward.code}`],
    );

    await client.query(
      `update loyalty_reward_stock
       set reserved_units = reserved_units + 1,
           updated_at = now()
       where reward_id = $1`,
      [reward.id],
    );

    await client.query(
      `insert into loyalty_redemption_tokens (
         id, redemption_id, token_hash, token_hint, status, expires_at
       )
       values ($1, $2, $3, $4, 'active', $5)`,
      [randomUUID(), redemptionId, tokenHash, tokenHint, expiresAt],
    );

    await client.query('commit');

    const redemption = await readRedemption(input.userId, redemptionId);
    if (!redemption) throw new RewardServiceError('REDEMPTION_NOT_FOUND', 'Canje no encontrado', 404);

    return {
      redemption,
      qrToken,
      duplicate: false,
    };
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

export async function reissueRedemptionToken(userId: string, redemptionId: string): Promise<{
  redemption: RedemptionSummary;
  qrToken: string;
}> {
  const client = await getPool().connect();
  try {
    await client.query('begin');

    const redemption = (
      await client.query<{ id: string; status: string; expires_at: Date | string }>(
        `select id, status, expires_at
         from loyalty_redemptions
         where id = $1 and user_id = $2
         for update`,
        [redemptionId, userId],
      )
    ).rows[0];

    if (!redemption) throw new RewardServiceError('REDEMPTION_NOT_FOUND', 'Canje no encontrado', 404);
    if (!['reserved', 'issued'].includes(redemption.status)) {
      throw new RewardServiceError('REDEMPTION_NOT_REISSUABLE', 'Este canje ya no admite un nuevo código', 409);
    }
    if (new Date(redemption.expires_at).getTime() <= Date.now()) {
      throw new RewardServiceError('REDEMPTION_EXPIRED', 'El canje ha caducado', 409);
    }

    await client.query(
      `update loyalty_redemption_tokens
       set status = 'revoked'
       where redemption_id = $1 and status = 'active'`,
      [redemptionId],
    );

    const qrToken = newBearerToken();
    await client.query(
      `insert into loyalty_redemption_tokens (
         id, redemption_id, token_hash, token_hint, status, expires_at
       )
       values ($1, $2, $3, $4, 'active', $5)`,
      [
        randomUUID(),
        redemptionId,
        hashToken(qrToken),
        qrToken.slice(-8),
        new Date(redemption.expires_at),
      ],
    );

    await client.query('commit');

    const summary = await readRedemption(userId, redemptionId);
    if (!summary) throw new RewardServiceError('REDEMPTION_NOT_FOUND', 'Canje no encontrado', 404);
    return { redemption: summary, qrToken };
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}
