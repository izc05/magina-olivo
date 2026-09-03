import { createHash } from 'node:crypto';
import type pg from 'pg';

type ExportRow = {
  artifact_text: string | null;
  status: 'requested' | 'generating' | 'ready' | 'expired' | 'failed';
};

function iso(value: Date | string | null): string | null {
  if (value === null) return null;
  return value instanceof Date ? value.toISOString() : value;
}

export async function augmentAccountExportWithTasks(
  pool: pg.Pool,
  exportId: string,
  userId: string,
): Promise<void> {
  try {
    const exportResult = await pool.query<ExportRow>(
      `
        select artifact_text, status
        from account_exports
        where id = $1 and user_id = $2
        limit 1
      `,
      [exportId, userId],
    );
    const row = exportResult.rows[0];
    if (!row || row.status !== 'ready' || !row.artifact_text) {
      throw new Error('Structured account export artifact is not ready for task augmentation');
    }

    const tasks = await pool.query(
      `
        select
          t.id, t.holding_id, t.campaign_id, t.farm_id, t.plot_id,
          t.title, t.notes, t.due_date::text as due_date, t.priority,
          t.reminder_days_before, t.status, t.completed_at, t.version,
          t.created_at, t.updated_at
        from tasks t
        where t.holding_id in (
          select hm.holding_id
          from holding_members hm
          where hm.user_id = $1
            and hm.role = 'owner'
            and hm.status = 'active'
        )
        order by t.due_date asc, t.created_at asc, t.id asc
      `,
      [userId],
    );

    const payload = JSON.parse(row.artifact_text) as Record<string, unknown>;
    payload.tasks = tasks.rows.map((task: Record<string, unknown>) => ({
      id: task.id,
      holdingId: task.holding_id,
      campaignId: task.campaign_id,
      farmId: task.farm_id,
      plotId: task.plot_id,
      title: task.title,
      notes: task.notes,
      dueDate: task.due_date,
      priority: task.priority,
      reminderDaysBefore: task.reminder_days_before,
      status: task.status,
      completedAt: iso(task.completed_at as Date | string | null),
      version: Number(task.version),
      createdAt: iso(task.created_at as Date | string | null),
      updatedAt: iso(task.updated_at as Date | string | null),
    }));

    const artifact = `${JSON.stringify(payload, null, 2)}\n`;
    const sizeBytes = Buffer.byteLength(artifact, 'utf8');
    const sha256 = createHash('sha256').update(artifact, 'utf8').digest('hex');

    const updated = await pool.query(
      `
        update account_exports
        set artifact_text = $3,
            size_bytes = $4,
            sha256 = $5,
            updated_at = now()
        where id = $1
          and user_id = $2
          and status = 'ready'
        returning id
      `,
      [exportId, userId, artifact, sizeBytes, sha256],
    );
    if (!updated.rows[0]) {
      throw new Error('Task-augmented account export could not be persisted');
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await pool.query(
      `
        update account_exports
        set status = 'failed',
            artifact_text = null,
            size_bytes = null,
            sha256 = null,
            error_message = $3,
            completed_at = null,
            expires_at = null,
            updated_at = now()
        where id = $1 and user_id = $2 and status <> 'expired'
      `,
      [exportId, userId, message.slice(0, 4000)],
    );
    throw error;
  }
}
