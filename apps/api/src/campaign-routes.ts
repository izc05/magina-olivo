import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { canWrite, getCampaignAccess, getHoldingAccess } from './authorization.ts';
import { decideCampaignClose, type CampaignLifecycleStatus } from './campaign-close-policy.ts';
import { getPool } from './db.ts';
import { apiError } from './http-errors.ts';
import { awardLoyaltyBestEffort } from './loyalty-business-awards.ts';
import { campaignCompletedLoyaltyAward } from './loyalty-business-policy.ts';
import { getAuthenticatedSession } from './session.ts';

type HoldingParams = { holdingId: string };
type CampaignParams = { campaignId: string };
type CreateCampaignBody = {
  name: string;
  seasonStartYear: number;
  startDate?: string;
  notes?: string;
};
type CloseCampaignBody = {
  endDate?: string;
};

type CampaignRow = {
  id: string;
  name: string;
  season_start_year: number;
  season_end_year: number;
  start_date: string | null;
  end_date: string | null;
  status: CampaignLifecycleStatus;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
};

function serializeCampaign(row: CampaignRow) {
  return {
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
  };
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

      const result = await getPool().query<CampaignRow>(
        `
          select id, name, season_start_year, season_end_year, start_date,
                 end_date, status, notes, created_at, updated_at
          from campaigns
          where holding_id = $1 and status <> 'archived'
          order by season_start_year desc, created_at desc
        `,
        [access.holdingId],
      );

      return { items: result.rows.map(serializeCampaign) };
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
      const row = (
        await getPool().query<CampaignRow>(
          `
            insert into campaigns (
              id, holding_id, name, season_start_year, season_end_year,
              start_date, status, notes
            )
            values ($1, $2, $3, $4, $5, $6, 'active', $7)
            returning id, name, season_start_year, season_end_year,
                      start_date, end_date, status, notes, created_at, updated_at
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

      if (!row) throw new Error('Campaign insert returned no row');
      return reply.code(201).send(serializeCampaign(row));
    },
  );

  app.post<{ Params: CampaignParams; Body: CloseCampaignBody }>(
    '/api/v1/campaigns/:campaignId/close',
    {
      schema: {
        body: {
          type: 'object',
          additionalProperties: false,
          properties: {
            endDate: { type: 'string', format: 'date' },
          },
        },
      },
    },
    async (request, reply) => {
      const session = await getAuthenticatedSession(request);
      if (!session) {
        return reply.code(401).send(apiError(request, 'AUTH_REQUIRED', 'Authentication required'));
      }

      const access = await getCampaignAccess(session.user.id, request.params.campaignId);
      if (!access) {
        return reply.code(404).send(apiError(request, 'CAMPAIGN_NOT_FOUND', 'Campaign not found'));
      }

      const client = await getPool().connect();
      let committed = false;
      try {
        await client.query('begin');
        const locked = (
          await client.query<{
            id: string;
            holding_id: string;
            status: CampaignLifecycleStatus;
            start_date: string | null;
            end_date: string | null;
            today: string;
          }>(
            `
              select id, holding_id, status,
                     start_date::text as start_date,
                     end_date::text as end_date,
                     (now() at time zone 'Europe/Madrid')::date::text as today
              from campaigns
              where id = $1 and holding_id = $2 and status <> 'archived'
              for update
            `,
            [request.params.campaignId, access.holdingId],
          )
        ).rows[0];

        if (!locked) {
          await client.query('rollback');
          return reply.code(404).send(apiError(request, 'CAMPAIGN_NOT_FOUND', 'Campaign not found'));
        }

        const counts = (
          await client.query<{
            confirmed_delivery_count: number;
            pending_yield_count: number;
          }>(
            `
              select
                count(*) filter (
                  where d.verification_status = 'confirmed'
                )::int as confirmed_delivery_count,
                count(*) filter (
                  where d.verification_status = 'confirmed'
                    and not exists (
                      select 1
                      from delivery_results dr
                      where dr.holding_id = d.holding_id
                        and dr.delivery_id = d.id
                        and dr.result_type = 'fat_yield'
                        and dr.status = 'current'
                    )
                )::int as pending_yield_count
              from deliveries d
              where d.holding_id = $1
                and d.campaign_id = $2
                and d.verification_status <> 'archived'
            `,
            [access.holdingId, request.params.campaignId],
          )
        ).rows[0] ?? { confirmed_delivery_count: 0, pending_yield_count: 0 };

        const decision = decideCampaignClose({
          role: access.role,
          status: locked.status,
          confirmedDeliveryCount: counts.confirmed_delivery_count,
          pendingYieldCount: counts.pending_yield_count,
          startDate: locked.start_date,
          existingEndDate: locked.end_date,
          requestedEndDate: request.body?.endDate ?? null,
          today: locked.today,
        });

        if (!decision.ok) {
          await client.query('rollback');
          return reply.code(decision.statusCode).send(
            apiError(request, decision.code, decision.message),
          );
        }

        let row: CampaignRow;
        if (decision.alreadyClosed) {
          const existing = (
            await client.query<CampaignRow>(
              `
                select id, name, season_start_year, season_end_year, start_date,
                       end_date, status, notes, created_at, updated_at
                from campaigns
                where id = $1 and holding_id = $2
              `,
              [request.params.campaignId, access.holdingId],
            )
          ).rows[0];
          if (!existing) throw new Error('Closed campaign disappeared while locked');
          row = existing;
        } else {
          const updated = (
            await client.query<CampaignRow>(
              `
                update campaigns
                set status = 'closed',
                    end_date = $1,
                    version = version + 1,
                    updated_at = now()
                where id = $2 and holding_id = $3 and status = 'active'
                returning id, name, season_start_year, season_end_year, start_date,
                          end_date, status, notes, created_at, updated_at
              `,
              [decision.endDate, request.params.campaignId, access.holdingId],
            )
          ).rows[0];
          if (!updated) throw new Error('Campaign close update returned no row');
          row = updated;
        }

        await client.query('commit');
        committed = true;

        await awardLoyaltyBestEffort(
          campaignCompletedLoyaltyAward(session.user.id, request.params.campaignId),
          'campaign.close',
        );

        return reply.send({
          ...serializeCampaign(row),
          alreadyClosed: decision.alreadyClosed,
        });
      } catch (error) {
        if (!committed) {
          await client.query('rollback').catch(() => undefined);
        }
        throw error;
      } finally {
        client.release();
      }
    },
  );
}
