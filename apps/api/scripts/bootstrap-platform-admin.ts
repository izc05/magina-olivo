import { closeDatabase, getPool } from '../src/db.ts';

const email = process.env.PLATFORM_SUPER_ADMIN_EMAIL?.trim().toLowerCase();
const confirmation = process.env.PLATFORM_SUPER_ADMIN_CONFIRM;

if (!email) throw new Error('PLATFORM_SUPER_ADMIN_EMAIL is required');
if (confirmation !== 'GRANT_SUPER_ADMIN') {
  throw new Error('Set PLATFORM_SUPER_ADMIN_CONFIRM=GRANT_SUPER_ADMIN to confirm this one-time bootstrap');
}

const db = getPool();

try {
  const existing = await db.query<{ user_id: string }>(
    "select user_id from platform_admin_members where status = 'active' and role = 'super_admin' limit 1",
  );
  if (existing.rows[0]) {
    throw new Error('An active super_admin already exists; use the audited administration process for subsequent changes');
  }

  const user = await db.query<{ id: string }>(
    'select id from "user" where lower(email) = $1 limit 1',
    [email],
  );
  const userId = user.rows[0]?.id;
  if (!userId) {
    throw new Error('The administrator must create and verify their account before bootstrap');
  }

  await db.query('begin');
  try {
    await db.query(
      `
        insert into platform_admin_members (user_id, role, status, granted_by_user_id)
        values ($1, 'super_admin', 'active', $1)
      `,
      [userId],
    );
    await db.query(
      `
        insert into platform_admin_audit_log (actor_user_id, action, target_type, target_id, metadata)
        values ($1, 'platform_admin.bootstrap', 'platform_admin_member', $1, '{"role":"super_admin"}'::jsonb)
      `,
      [userId],
    );
    await db.query('commit');
  } catch (error) {
    await db.query('rollback');
    throw error;
  }

  console.log('Initial platform administrator granted. Remove the bootstrap environment variables now.');
} finally {
  await closeDatabase();
}
