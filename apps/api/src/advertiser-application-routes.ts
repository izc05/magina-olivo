import { randomUUID } from 'node:crypto';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { getPool } from './db.ts';
import { apiError } from './http-errors.ts';
import { getAuthenticatedSession, type AuthenticatedSession } from './session.ts';

type AdvertisingCategory =
  | 'cooperative'
  | 'oil_mill'
  | 'machinery'
  | 'workshop'
  | 'harvest'
  | 'nursery'
  | 'irrigation'
  | 'pruning'
  | 'phytosanitary'
  | 'insurance'
  | 'advisory'
  | 'other';

type ApplicationBody = {
  businessName: string;
  category: AdvertisingCategory;
  municipality?: string | null;
  contactName: string;
  contactPhone?: string | null;
  requestedPlanCode?: 'free' | 'featured' | 'premium' | null;
  description?: string | null;
  destinationId?: string | null;
};

type ApplicationRow = {
  id: string;
  business_name: string;
  category: AdvertisingCategory;
  municipality: string | null;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  requested_plan_code: 'free' | 'featured' | 'premium' | null;
  description: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'withdrawn';
  review_notes: string | null;
  created_at: Date;
  reviewed_at: Date | null;
};

function applicationsAreEnabled(): boolean {
  return process.env.MAGINA_ADVERTISING_APPLICATIONS_ENABLED?.trim().toLowerCase() === 'true';
}

async function requireAuthenticatedUser(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<AuthenticatedSession | null> {
  const session = await getAuthenticatedSession(request);
  if (!session) {
    reply.code(401).send(apiError(request, 'AUTH_REQUIRED', 'Authentication required'));
    return null;
  }
  return session;
}

function trimNullable(value: string | null | undefined): string | null {
  const normalized = value?.trim() ?? '';
  return normalized.length > 0 ? normalized : null;
}

function serializeApplication(row: ApplicationRow) {
  return {
    id: row.id,
    businessName: row.business_name,
    category: row.category,
    municipality: row.municipality,
    contactName: row.contact_name,
    contactEmail: row.contact_email,
    contactPhone: row.contact_phone,
    requestedPlanCode: row.requested_plan_code,
    description: row.description,
    status: row.status,
    reviewNotes: row.review_notes,
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at,
  };
}

export function registerAdvertiserApplicationRoutes(app: FastifyInstance): void {
  app.get('/api/v1/public/advertising/application-config', async () => {
    const enabled = applicationsAreEnabled();
    if (!enabled) {
      return { enabled: false, plans: [] };
    }

    const plans = await getPool().query<{
      code: 'free' | 'featured' | 'premium';
      name: string;
      public_label: string;
      priority: number;
    }>(
      `
        select code, name, public_label, priority
        from advertising_plans
        where active = true
        order by priority asc
      `,
    );

    return {
      enabled: true,
      plans: plans.rows.map((row) => ({
        code: row.code,
        name: row.name,
        publicLabel: row.public_label,
        priority: row.priority,
      })),
    };
  });

  app.get('/api/v1/advertising/applications/me', async (request, reply) => {
    const session = await requireAuthenticatedUser(request, reply);
    if (!session) return;

    const result = await getPool().query<ApplicationRow>(
      `
        select
          id, business_name, category, municipality, contact_name, contact_email,
          contact_phone, requested_plan_code, description, status, review_notes,
          created_at, reviewed_at
        from advertiser_applications
        where lower(contact_email) = lower($1)
        order by created_at desc
        limit 10
      `,
      [session.user.email],
    );

    return {
      applicationsEnabled: applicationsAreEnabled(),
      applications: result.rows.map(serializeApplication),
    };
  });

  app.post<{ Body: ApplicationBody }>(
    '/api/v1/advertising/applications',
    {
      schema: {
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['businessName', 'category', 'contactName'],
          properties: {
            businessName: { type: 'string', minLength: 2, maxLength: 180 },
            category: {
              type: 'string',
              enum: [
                'cooperative', 'oil_mill', 'machinery', 'workshop', 'harvest', 'nursery',
                'irrigation', 'pruning', 'phytosanitary', 'insurance', 'advisory', 'other',
              ],
            },
            municipality: { anyOf: [{ type: 'string', minLength: 1, maxLength: 120 }, { type: 'null' }] },
            contactName: { type: 'string', minLength: 2, maxLength: 160 },
            contactPhone: { anyOf: [{ type: 'string', minLength: 5, maxLength: 40 }, { type: 'null' }] },
            requestedPlanCode: {
              anyOf: [
                { type: 'string', enum: ['free', 'featured', 'premium'] },
                { type: 'null' },
              ],
            },
            description: { anyOf: [{ type: 'string', maxLength: 1200 }, { type: 'null' }] },
            destinationId: { anyOf: [{ type: 'string', format: 'uuid' }, { type: 'null' }] },
          },
        },
      },
    },
    async (request, reply) => {
      if (!applicationsAreEnabled()) {
        return reply.code(403).send(apiError(
          request,
          'ADVERTISING_APPLICATIONS_DISABLED',
          'Business applications are not enabled in this environment',
        ));
      }

      const session = await requireAuthenticatedUser(request, reply);
      if (!session) return;

      const db = getPool();
      const businessName = request.body.businessName.trim();
      const contactName = request.body.contactName.trim();
      const municipality = trimNullable(request.body.municipality);
      const contactPhone = trimNullable(request.body.contactPhone);
      const description = trimNullable(request.body.description);
      const requestedPlanCode = request.body.requestedPlanCode ?? null;
      const destinationId = request.body.destinationId ?? null;

      if (requestedPlanCode) {
        const plan = await db.query<{ code: string }>(
          `select code from advertising_plans where code = $1 and active = true limit 1`,
          [requestedPlanCode],
        );
        if (!plan.rows[0]) {
          return reply.code(400).send(apiError(request, 'ADVERTISING_PLAN_UNAVAILABLE', 'Advertising plan is not available'));
        }
      }

      if (destinationId) {
        const destination = await db.query<{ id: string }>(
          `select id from cooperatives where id = $1 and verification_status <> 'stale' limit 1`,
          [destinationId],
        );
        if (!destination.rows[0]) {
          return reply.code(400).send(apiError(request, 'DIRECTORY_ENTITY_NOT_FOUND', 'Directory entity is not available'));
        }
      }

      const duplicate = await db.query<{ id: string }>(
        `
          select id
          from advertiser_applications
          where lower(contact_email) = lower($1)
            and lower(business_name) = lower($2)
            and status = 'pending'
          limit 1
        `,
        [session.user.email, businessName],
      );
      if (duplicate.rows[0]) {
        return reply.code(409).send(apiError(
          request,
          'ADVERTISING_APPLICATION_ALREADY_PENDING',
          'A pending application already exists for this business and account',
        ));
      }

      const pendingCount = await db.query<{ total: string }>(
        `
          select count(*)::text as total
          from advertiser_applications
          where lower(contact_email) = lower($1)
            and status = 'pending'
        `,
        [session.user.email],
      );
      if (Number(pendingCount.rows[0]?.total ?? 0) >= 3) {
        return reply.code(429).send(apiError(
          request,
          'TOO_MANY_PENDING_ADVERTISING_APPLICATIONS',
          'This account already has the maximum number of pending business applications',
        ));
      }

      const result = await db.query<ApplicationRow>(
        `
          insert into advertiser_applications (
            id, destination_id, business_name, category, municipality,
            contact_name, contact_email, contact_phone, requested_plan_code, description
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          returning
            id, business_name, category, municipality, contact_name, contact_email,
            contact_phone, requested_plan_code, description, status, review_notes,
            created_at, reviewed_at
        `,
        [
          randomUUID(),
          destinationId,
          businessName,
          request.body.category,
          municipality,
          contactName,
          session.user.email,
          contactPhone,
          requestedPlanCode,
          description,
        ],
      );

      return reply.code(201).send({ application: serializeApplication(result.rows[0]!) });
    },
  );
}
