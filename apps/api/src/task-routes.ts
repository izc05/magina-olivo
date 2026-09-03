import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { canWrite, getHoldingAccess } from './authorization.ts';
import { getPool } from './db.ts';
import { apiError } from './http-errors.ts';
import { getAuthenticatedSession } from './session.ts';

type HoldingParams = { holdingId: string };
type TaskParams = { taskId: string };

type TaskQuery = {
  from?: string;
  to?: string;
  status?: 'pending' | 'completed' | 'all';
};

type CreateTaskBody = {
  title: string;
  notes?: string;
  dueDate: string;
  priority?: 'low' | 'normal' | 'high';
  reminderDaysBefore?: number | null;
  campaignId?: string;
  farmId?: string;
  plotId?: string;
};

type UpdateTaskBody = {
  version: number;
  title?: string;
  notes?: string | null;
  dueDate?: string;
  priority?: 'low' | 'normal' | 'high';
  reminderDaysBefore?: number | null;
};

type CompleteTaskBody = { version: number };

type TaskRow = {
  id: string;
  holding_id: string;
  campaign_id: string | null;
  campaign_name: string | null;
  farm_id: string | null;
  farm_name: string | null;
  plot_id: string | null;
  plot_name: string | null;
  title: string;
  notes: string | null;
  due_date: string;
  priority: 'low' | 'normal' | 'high';
  reminder_days_before: number | null;
  status: 'pending' | 'completed' | 'cancelled';
  created_by: string;
  completed_at: Date | null;
  version: string;
  created_at: Date;
  updated_at: Date;
  overdue: boolean;
};

const DATE_PATTERN = '^\\d{4}-\\d{2}-\\d{2}$';

function mapTask(row: TaskRow) {
  return {
    id: row.id,
    holdingId: row.holding_id,
    campaignId: row.campaign_id,
    campaignName: row.campaign_name,
    farmId: row.farm_id,
    farmName: row.farm_name,
    plotId: row.plot_id,
    plotName: row.plot_name,
    title: row.title,
    notes: row.notes,
    dueDate: row.due_date,
    priority: row.priority,
    reminderDaysBefore: row.reminder_days_before,
    status: row.status,
    completedAt: row.completed_at,
    version: Number(row.version),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    overdue: row.overdue,
  };
}

const taskSelect = `
  select
    t.id, t.holding_id,
    t.campaign_id, c.name as campaign_name,
    t.farm_id, f.name as farm_name,
    t.plot_id, p.name as plot_name,
    t.title, t.notes, t.due_date::text as due_date, t.priority,
    t.reminder_days_before, t.status, t.created_by, t.completed_at,
    t.version, t.created_at, t.updated_at,
    (t.status = 'pending' and t.due_date < (now() at time zone 'Europe/Madrid')::date) as overdue
  from tasks t
  left join campaigns c on c.id = t.campaign_id and c.holding_id = t.holding_id
  left join farms f on f.id = t.farm_id and f.holding_id = t.holding_id
  left join plots p on p.id = t.plot_id and p.holding_id = t.holding_id
`;

async function validateScope(
  holdingId: string,
  campaignId: string | null,
  farmId: string | null,
  plotId: string | null,
): Promise<boolean> {
  const result = await getPool().query<{
    campaign_ok: boolean;
    farm_ok: boolean;
    plot_ok: boolean;
    hierarchy_ok: boolean;
  }>(
    `
      select
        ($2::uuid is null or exists(
          select 1 from campaigns c
          where c.id = $2 and c.holding_id = $1 and c.status <> 'archived'
        )) as campaign_ok,
        ($3::uuid is null or exists(
          select 1 from farms f
          where f.id = $3 and f.holding_id = $1 and f.active = true
        )) as farm_ok,
        ($4::uuid is null or exists(
          select 1 from plots p
          where p.id = $4 and p.holding_id = $1 and p.active = true
        )) as plot_ok,
        ($4::uuid is null or $3::uuid is null or exists(
          select 1 from plots p
          where p.id = $4 and p.farm_id = $3 and p.holding_id = $1 and p.active = true
        )) as hierarchy_ok
    `,
    [holdingId, campaignId, farmId, plotId],
  );
  const row = result.rows[0];
  return Boolean(row?.campaign_ok && row.farm_ok && row.plot_ok && row.hierarchy_ok);
}

async function loadTask(taskId: string): Promise<TaskRow | null> {
  const result = await getPool().query<TaskRow>(
    `${taskSelect} where t.id = $1 limit 1`,
    [taskId],
  );
  return result.rows[0] ?? null;
}

export function registerTaskRoutes(app: FastifyInstance): void {
  app.get<{ Params: HoldingParams; Querystring: TaskQuery }>(
    '/api/v1/holdings/:holdingId/tasks',
    {
      schema: {
        querystring: {
          type: 'object',
          additionalProperties: false,
          properties: {
            from: { type: 'string', pattern: DATE_PATTERN },
            to: { type: 'string', pattern: DATE_PATTERN },
            status: { type: 'string', enum: ['pending', 'completed', 'all'] },
          },
        },
      },
    },
    async (request, reply) => {
      const session = await getAuthenticatedSession(request);
      if (!session) {
        return reply.code(401).send(apiError(request, 'AUTH_REQUIRED', 'Authentication required'));
      }
      const access = await getHoldingAccess(session.user.id, request.params.holdingId);
      if (!access) {
        return reply.code(404).send(apiError(request, 'HOLDING_NOT_FOUND', 'Holding not found'));
      }

      if (request.query.from && request.query.to && request.query.from > request.query.to) {
        return reply.code(400).send(apiError(request, 'INVALID_TASK_RANGE', 'Task range is invalid'));
      }

      const values: unknown[] = [request.params.holdingId];
      const filters = ['t.holding_id = $1'];
      if (request.query.from) {
        values.push(request.query.from);
        filters.push(`t.due_date >= $${values.length}::date`);
      }
      if (request.query.to) {
        values.push(request.query.to);
        filters.push(`t.due_date <= $${values.length}::date`);
      }
      const status = request.query.status ?? 'all';
      if (status !== 'all') {
        values.push(status);
        filters.push(`t.status = $${values.length}`);
      } else {
        filters.push("t.status <> 'cancelled'");
      }

      const result = await getPool().query<TaskRow>(
        `
          ${taskSelect}
          where ${filters.join(' and ')}
          order by t.due_date asc,
            case t.priority when 'high' then 0 when 'normal' then 1 else 2 end asc,
            t.created_at asc,
            t.id asc
          limit 500
        `,
        values,
      );
      return { items: result.rows.map(mapTask) };
    },
  );

  app.post<{ Params: HoldingParams; Body: CreateTaskBody }>(
    '/api/v1/holdings/:holdingId/tasks',
    {
      schema: {
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['title', 'dueDate'],
          properties: {
            title: { type: 'string', minLength: 1, maxLength: 160 },
            notes: { type: 'string', maxLength: 4000 },
            dueDate: { type: 'string', pattern: DATE_PATTERN },
            priority: { type: 'string', enum: ['low', 'normal', 'high'] },
            reminderDaysBefore: { anyOf: [{ type: 'integer', minimum: 0, maximum: 30 }, { type: 'null' }] },
            campaignId: { type: 'string', format: 'uuid' },
            farmId: { type: 'string', format: 'uuid' },
            plotId: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    async (request, reply) => {
      const session = await getAuthenticatedSession(request);
      if (!session) {
        return reply.code(401).send(apiError(request, 'AUTH_REQUIRED', 'Authentication required'));
      }
      const access = await getHoldingAccess(session.user.id, request.params.holdingId);
      if (!access) {
        return reply.code(404).send(apiError(request, 'HOLDING_NOT_FOUND', 'Holding not found'));
      }
      if (!canWrite(access.role)) {
        return reply.code(403).send(apiError(request, 'WRITE_FORBIDDEN', 'Write access required'));
      }

      const title = request.body.title.trim();
      if (!title) {
        return reply.code(400).send(apiError(request, 'INVALID_TASK_TITLE', 'Task title is required'));
      }
      const campaignId = request.body.campaignId ?? null;
      const farmId = request.body.farmId ?? null;
      const plotId = request.body.plotId ?? null;
      if (!(await validateScope(request.params.holdingId, campaignId, farmId, plotId))) {
        return reply.code(400).send(apiError(request, 'TASK_SCOPE_MISMATCH', 'Task links must belong to the same holding'));
      }

      const id = randomUUID();
      await getPool().query(
        `
          insert into tasks (
            id, holding_id, campaign_id, farm_id, plot_id, title, notes, due_date,
            priority, reminder_days_before, status, created_by
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8::date, $9, $10, 'pending', $11)
        `,
        [
          id,
          request.params.holdingId,
          campaignId,
          farmId,
          plotId,
          title,
          request.body.notes?.trim() || null,
          request.body.dueDate,
          request.body.priority ?? 'normal',
          request.body.reminderDaysBefore ?? null,
          session.user.id,
        ],
      );
      const row = await loadTask(id);
      if (!row) throw new Error('Task insert returned no row');
      return reply.code(201).send(mapTask(row));
    },
  );

  app.patch<{ Params: TaskParams; Body: UpdateTaskBody }>(
    '/api/v1/tasks/:taskId',
    {
      schema: {
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['version'],
          properties: {
            version: { type: 'integer', minimum: 1 },
            title: { type: 'string', minLength: 1, maxLength: 160 },
            notes: { anyOf: [{ type: 'string', maxLength: 4000 }, { type: 'null' }] },
            dueDate: { type: 'string', pattern: DATE_PATTERN },
            priority: { type: 'string', enum: ['low', 'normal', 'high'] },
            reminderDaysBefore: { anyOf: [{ type: 'integer', minimum: 0, maximum: 30 }, { type: 'null' }] },
          },
        },
      },
    },
    async (request, reply) => {
      const session = await getAuthenticatedSession(request);
      if (!session) {
        return reply.code(401).send(apiError(request, 'AUTH_REQUIRED', 'Authentication required'));
      }
      const current = await loadTask(request.params.taskId);
      if (!current) {
        return reply.code(404).send(apiError(request, 'TASK_NOT_FOUND', 'Task not found'));
      }
      const access = await getHoldingAccess(session.user.id, current.holding_id);
      if (!access) {
        return reply.code(404).send(apiError(request, 'TASK_NOT_FOUND', 'Task not found'));
      }
      if (!canWrite(access.role)) {
        return reply.code(403).send(apiError(request, 'WRITE_FORBIDDEN', 'Write access required'));
      }
      if (current.status !== 'pending') {
        return reply.code(409).send(apiError(request, 'TASK_NOT_EDITABLE', 'Only pending tasks can be edited'));
      }

      const title = request.body.title === undefined ? current.title : request.body.title.trim();
      if (!title) {
        return reply.code(400).send(apiError(request, 'INVALID_TASK_TITLE', 'Task title is required'));
      }
      const result = await getPool().query<{ id: string }>(
        `
          update tasks
          set title = $3,
              notes = $4,
              due_date = $5::date,
              priority = $6,
              reminder_days_before = $7,
              version = version + 1,
              updated_at = now()
          where id = $1
            and holding_id = $2
            and version = $8
            and status = 'pending'
          returning id
        `,
        [
          current.id,
          current.holding_id,
          title,
          request.body.notes === undefined ? current.notes : request.body.notes?.trim() || null,
          request.body.dueDate ?? current.due_date,
          request.body.priority ?? current.priority,
          request.body.reminderDaysBefore === undefined ? current.reminder_days_before : request.body.reminderDaysBefore,
          request.body.version,
        ],
      );
      if (!result.rows[0]) {
        return reply.code(409).send(apiError(request, 'TASK_CONFLICT', 'Task changed since it was opened'));
      }
      const updated = await loadTask(current.id);
      if (!updated) throw new Error('Updated task not found');
      return mapTask(updated);
    },
  );

  app.post<{ Params: TaskParams; Body: CompleteTaskBody }>(
    '/api/v1/tasks/:taskId/complete',
    {
      schema: {
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['version'],
          properties: { version: { type: 'integer', minimum: 1 } },
        },
      },
    },
    async (request, reply) => {
      const session = await getAuthenticatedSession(request);
      if (!session) {
        return reply.code(401).send(apiError(request, 'AUTH_REQUIRED', 'Authentication required'));
      }
      const current = await loadTask(request.params.taskId);
      if (!current) {
        return reply.code(404).send(apiError(request, 'TASK_NOT_FOUND', 'Task not found'));
      }
      const access = await getHoldingAccess(session.user.id, current.holding_id);
      if (!access) {
        return reply.code(404).send(apiError(request, 'TASK_NOT_FOUND', 'Task not found'));
      }
      if (!canWrite(access.role)) {
        return reply.code(403).send(apiError(request, 'WRITE_FORBIDDEN', 'Write access required'));
      }
      if (current.status === 'completed') {
        return reply.code(200).send(mapTask(current));
      }
      if (current.status !== 'pending') {
        return reply.code(409).send(apiError(request, 'TASK_NOT_COMPLETABLE', 'Task cannot be completed'));
      }

      const result = await getPool().query<{ id: string }>(
        `
          update tasks
          set status = 'completed',
              completed_by = $3,
              completed_at = now(),
              version = version + 1,
              updated_at = now()
          where id = $1
            and holding_id = $2
            and version = $4
            and status = 'pending'
          returning id
        `,
        [current.id, current.holding_id, session.user.id, request.body.version],
      );
      if (!result.rows[0]) {
        return reply.code(409).send(apiError(request, 'TASK_CONFLICT', 'Task changed since it was opened'));
      }
      const completed = await loadTask(current.id);
      if (!completed) throw new Error('Completed task not found');
      return mapTask(completed);
    },
  );
}
