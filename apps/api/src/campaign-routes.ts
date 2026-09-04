import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { canWrite, getHoldingAccess } from './authorization.ts';
import { getPool } from './db.ts';
import { apiError } from './http-errors.ts';
import { getAuthenticatedSession } from './session.ts';

type HoldingParams = { holdingId: string };
type CreateCampaignBody = {
  name: string;
  seasonStartYear: number;
  startDate?: string;
  notes?: string;
};

function isUniqueViolation(reason: unknown): boolean {
  return typeof reason === 'object'
    && reason !== null
    && 'code' in reason
    && (reason as { code?: unknown }).code === '23505';
}

export function registerCampaignRoutes(app: FastifyInstance): void {
  app.get<{ Params: HoldingParams }>(
    '/api/v1/holdings/:holdingId/campaigns',
    async (request, reply) => {
      const session = await getAuthenticatedSession(request);
      if (!session) {
        return reply.code(401).send(apiError(request, 'AUTH_REQUIRED', 'Authentication required'));
      }

      const access = await getHoldingAccess(session.user.id, request.params.holdingId);
      if (!access) {
        return reply.code(404).send(apiError(request, 'HOLDING_NOT_FOUND', 'Holding not found'));
      }

      const result = await getPool().query<{
        id: string;
        name: string;
        season_start_year: number;
        season_end_year: number;
        start_date: string | null;
        end_date: string | null;
        status: string;
        notes: string | null;
        created_at: Date;
        updated_at: Date;
      }>(
        `
          select id, name, season_start_year, season_end_year, start_date,
                 end_date, status, notes, created_at, updated_at
          from campaigns
          where holding_id = $1 and status <> 'archived'
          order by season_start_year desc, created_at desc
        `,
        [access.holdingId],
      );

      return {
        items: result.rows.map((row) => ({
          id: row.id,
          name: row.name,
          seasonStartYear: row.season_start_year,
          seasonEndYear: row.season_end_year,
          startDate: row.start_date,
          endDate: row.end_date,
          status: row.status,
          notes: row.notes,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        })),
      };
    },
  );

  app.post<{ Params: HoldingParams; Body: CreateCampaignBody }>(
    '/api/v1/holdings/:holdingId/campaigns',
    {
      schema: {
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['name', 'seasonStartYear'],
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 120 },
            seasonStartYear: { type: 'integer', minimum: 2000, maximum: 2200 },
            startDate: { type: 'string', format: 'date' },
            notes: { type: 'string', maxLength: 5000 },
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

      const name = request.body.name.trim();
      if (!name) {
        return reply.code(400).send(apiError(request, 'INVALID_CAMPAIGN_NAME', 'Campaign name is required'));
      }

      const id = randomUUID();
      let row: {
        id: string;
        name: string;
        season_start_year: number;
        season_end_year: number;
        start_date: string | null;
        status: string;
        notes: string | null;
        created_at: Date;
        updated_at: Date;
      } | undefined;

      try {
        row = (
          await getPool().query<{
            id: string;
            name: string;
            season_start_year: number;
            season_end_year: number;
            start_date: string | null;
            status: string;
            notes: string | null;
            created_at: Date;
            updated_at: Date;
          }>(
            `
              insert into campaigns (
                id, holding_id, name, season_start_year, season_end_year,
                start_date, status, notes
              )
              values ($1, $2, $3, $4, $5, $6, 'active', $7)
              returning id, name, season_start_year, season_end_year,
                        start_date, status, notes, created_at, updated_at
            `,
            [
              id,
              access.holdingId,
              name,
              request.body.seasonStartYear,
              request.body.seasonStartYear + 1,
              request.body.startDate ?? null,
              request.body.notes?.trim() || null,
            ],
          )
        ).rows[0];
      } catch (reason) {
        if (isUniqueViolation(reason)) {
          return reply.code(409).send(apiError(
            request,
            'CAMPAIGN_ALREADY_EXISTS',
            'A campaign for that season already exists',
          ));
        }
        throw reason;
      }

      if (!row) throw new Error('Campaign insert returned no row');

      return reply.code(201).send({
        id: row.id,
        name: row.name,
        seasonStartYear: row.season_start_year,
        seasonEndYear: row.season_end_year,
        startDate: row.start_date,
        status: row.status,
        notes: row.notes,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      });
    },
  );
}
