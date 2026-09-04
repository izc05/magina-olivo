import { createHash } from 'node:crypto';
import { getPool } from './db.ts';
import { RewardPartnerServiceError } from './reward-partner-service.ts';

export type RewardTokenInspection = {
  status: 'valid' | 'expired' | 'redeemed' | 'revoked' | 'inactive';
  redemptionId: string;
  rewardCode: string;
  rewardTitle: string;
  partnerName: string | null;
  pickupPoint: { id: string; name: string; address: string } | null;
  olivesCost: number;
  expiresAt: string;
};

function hashToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

function resolveStatus(input: {
  tokenStatus: string;
  redemptionStatus: string;
  tokenExpiresAt: Date | string;
  redemptionExpiresAt: Date | string;
}): RewardTokenInspection['status'] {
  if (input.tokenStatus === 'redeemed' || input.redemptionStatus === 'redeemed') return 'redeemed';
  if (input.tokenStatus === 'revoked') return 'revoked';
  if (
    input.tokenStatus === 'expired'
    || input.redemptionStatus === 'expired'
    || new Date(input.tokenExpiresAt).getTime() <= Date.now()
    || new Date(input.redemptionExpiresAt).getTime() <= Date.now()
  ) return 'expired';
  if (input.tokenStatus !== 'active' || !['reserved', 'issued'].includes(input.redemptionStatus)) return 'inactive';
  return 'valid';
}

export async function inspectRewardToken(input: {
  validatorUserId: string;
  token: string;
}): Promise<RewardTokenInspection> {
  const token = input.token.trim();
  if (token.length < 16 || token.length > 512) {
    throw new RewardPartnerServiceError('REWARD_TOKEN_INVALID', 'Código de recogida no válido', 400);
  }

  const row = (
    await getPool().query<{
      redemption_id: string;
      redemption_status: string;
      redemption_expires_at: Date | string;
      olives_cost: string | number;
      token_status: string;
      token_expires_at: Date | string;
      reward_code: string;
      reward_title: string;
      reward_partner_id: string | null;
      pickup_point_id: string | null;
      pickup_partner_id: string | null;
      pickup_name: string | null;
      pickup_address: string | null;
      partner_id: string | null;
      partner_name: string | null;
    }>(
      `select
         rd.id as redemption_id,
         rd.status as redemption_status,
         rd.expires_at as redemption_expires_at,
         rd.olives_cost,
         rt.status as token_status,
         rt.expires_at as token_expires_at,
         r.code as reward_code,
         r.title as reward_title,
         r.partner_id as reward_partner_id,
         pp.id as pickup_point_id,
         pp.partner_id as pickup_partner_id,
         pp.name as pickup_name,
         pp.address as pickup_address,
         coalesce(pp.partner_id, r.partner_id) as partner_id,
         rp.name as partner_name
       from loyalty_redemption_tokens rt
       join loyalty_redemptions rd on rd.id = rt.redemption_id
       join loyalty_rewards r on r.id = rd.reward_id
       left join reward_pickup_points pp on pp.id = rd.pickup_point_id
       left join reward_partners rp on rp.id = coalesce(pp.partner_id, r.partner_id)
       where rt.token_hash = $1
       limit 1`,
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
    await getPool().query<{ role: string }>(
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

  return {
    status: resolveStatus({
      tokenStatus: row.token_status,
      redemptionStatus: row.redemption_status,
      tokenExpiresAt: row.token_expires_at,
      redemptionExpiresAt: row.redemption_expires_at,
    }),
    redemptionId: row.redemption_id,
    rewardCode: row.reward_code,
    rewardTitle: row.reward_title,
    partnerName: row.partner_name,
    pickupPoint: row.pickup_point_id && row.pickup_name && row.pickup_address
      ? { id: row.pickup_point_id, name: row.pickup_name, address: row.pickup_address }
      : null,
    olivesCost: Number(row.olives_cost),
    expiresAt: new Date(row.redemption_expires_at).toISOString(),
  };
}
