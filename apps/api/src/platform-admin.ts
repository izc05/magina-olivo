import { getPool } from './db.ts';
import { isPlatformAdminRole, type PlatformAdminRole } from './platform-admin-access.ts';

type PlatformAdminRow = { role: string };

export async function getActivePlatformAdminRole(userId: string): Promise<PlatformAdminRole | null> {
  const result = await getPool().query<PlatformAdminRow>(
    `
      select role
      from platform_admin_members
      where user_id = $1
        and status = 'active'
      limit 1
    `,
    [userId],
  );
  const role = result.rows[0]?.role;
  return isPlatformAdminRole(role) ? role : null;
}

export async function writePlatformAdminAudit(input: {
  actorUserId: string;
  action: string;
  requestId: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await getPool().query(
    `
      insert into platform_admin_audit_log (
        actor_user_id, action, request_id, target_type, target_id, metadata
      ) values ($1, $2, $3, $4, $5, $6::jsonb)
    `,
    [
      input.actorUserId,
      input.action,
      input.requestId,
      input.targetType ?? null,
      input.targetId ?? null,
      JSON.stringify(input.metadata ?? {}),
    ],
  );
}
