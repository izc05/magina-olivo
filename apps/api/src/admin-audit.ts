import { randomUUID } from 'node:crypto';
import type { PoolClient, Pool } from 'pg';
import type { AuthenticatedSession } from './session.ts';

type Db = Pick<Pool, 'query'> | Pick<PoolClient, 'query'>;

type AuditInput = {
  action: string;
  entityType: string;
  entityId?: string | null;
  summary: string;
  metadata?: Record<string, string | number | boolean | null>;
};

export async function recordAdminAudit(
  db: Db,
  session: AuthenticatedSession,
  input: AuditInput,
): Promise<void> {
  await db.query(
    `
      insert into platform_admin_audit_log (
        id, actor_user_id, actor_email, action, entity_type, entity_id, summary, metadata
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
    `,
    [
      randomUUID(),
      session.user.id,
      session.user.email,
      input.action,
      input.entityType,
      input.entityId ?? null,
      input.summary,
      JSON.stringify(input.metadata ?? {}),
    ],
  );
}
