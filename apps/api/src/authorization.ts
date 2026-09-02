import { getPool } from './db.ts';

export type MembershipRole = 'owner' | 'admin' | 'collaborator' | 'viewer';

export type HoldingAccess = {
  holdingId: string;
  role: MembershipRole;
};

export function canWrite(role: MembershipRole): boolean {
  return role !== 'viewer';
}

export async function getHoldingAccess(
  userId: string,
  holdingId: string,
): Promise<HoldingAccess | null> {
  const result = await getPool().query<{ holding_id: string; role: MembershipRole }>(
    `
      select hm.holding_id, hm.role
      from holding_members hm
      join holdings h on h.id = hm.holding_id
      where hm.holding_id = $1
        and hm.user_id = $2
        and hm.status = 'active'
        and h.active = true
      limit 1
    `,
    [holdingId, userId],
  );

  const row = result.rows[0];
  return row ? { holdingId: row.holding_id, role: row.role } : null;
}

export async function getFarmAccess(
  userId: string,
  farmId: string,
): Promise<HoldingAccess | null> {
  const result = await getPool().query<{ holding_id: string; role: MembershipRole }>(
    `
      select f.holding_id, hm.role
      from farms f
      join holdings h on h.id = f.holding_id
      join holding_members hm on hm.holding_id = f.holding_id
      where f.id = $1
        and f.active = true
        and h.active = true
        and hm.user_id = $2
        and hm.status = 'active'
      limit 1
    `,
    [farmId, userId],
  );

  const row = result.rows[0];
  return row ? { holdingId: row.holding_id, role: row.role } : null;
}

export async function getCampaignAccess(
  userId: string,
  campaignId: string,
): Promise<HoldingAccess | null> {
  const result = await getPool().query<{ holding_id: string; role: MembershipRole }>(
    `
      select c.holding_id, hm.role
      from campaigns c
      join holdings h on h.id = c.holding_id
      join holding_members hm on hm.holding_id = c.holding_id
      where c.id = $1
        and c.status <> 'archived'
        and h.active = true
        and hm.user_id = $2
        and hm.status = 'active'
      limit 1
    `,
    [campaignId, userId],
  );

  const row = result.rows[0];
  return row ? { holdingId: row.holding_id, role: row.role } : null;
}
