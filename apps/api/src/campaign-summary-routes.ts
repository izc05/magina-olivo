import type { FastifyInstance } from 'fastify';
import { getCampaignAccess } from './authorization.ts';
import { getPool } from './db.ts';
import { apiError } from './http-errors.ts';
import { getAuthenticatedSession } from './session.ts';

type CampaignParams = { campaignId: string };

type SummaryRow = {
  deliveries_count: string;
  total_kilograms: string;
  deliveries_with_result: string;
  pending_result_count: string;
  result_covered_kilograms: string;
  coverage_percent: string | null;
  weighted_yield_percent: string | null;
};

export function registerCampaignSummaryRoutes(app: FastifyInstance): void {
  app.get<{ Params: CampaignParams }>(
    '/api/v1/campaigns/:campaignId/summary',
    async (request, reply) => {
      const session = await getAuthenticatedSession(request);
      if (!session) {
        return reply.code(401).send(apiError(request, 'AUTH_REQUIRED', 'Authentication required'));
      }

      const access = await getCampaignAccess(session.user.id, request.params.campaignId);
      if (!access) {
        return reply.code(404).send(apiError(request, 'CAMPAIGN_NOT_FOUND', 'Campaign not found'));
      }

      const result = await getPool().query<SummaryRow>(
        `
          with delivery_base as (
            select
              d.id,
              d.kilograms,
              current_result.value as yield_value
            from deliveries d
            left join lateral (
              select r.value
              from delivery_results r
              where r.holding_id = d.holding_id
                and r.delivery_id = d.id
                and r.result_type = 'fat_yield'
                and r.status = 'current'
              limit 1
            ) current_result on true
            where d.holding_id = $1
              and d.campaign_id = $2
              and d.verification_status = 'confirmed'
          ), aggregates as (
            select
              count(*) as deliveries_count,
              coalesce(sum(kilograms), 0::numeric) as total_kilograms,
              count(*) filter (where yield_value is not null) as deliveries_with_result,
              count(*) filter (where yield_value is null) as pending_result_count,
              coalesce(sum(kilograms) filter (where yield_value is not null), 0::numeric) as result_covered_kilograms,
              coalesce(sum(kilograms * yield_value) filter (where yield_value is not null), 0::numeric) as weighted_yield_numerator
            from delivery_base
          )
          select
            deliveries_count::text,
            total_kilograms::text,
            deliveries_with_result::text,
            pending_result_count::text,
            result_covered_kilograms::text,
            case
              when total_kilograms > 0
                then round((result_covered_kilograms * 100) / total_kilograms, 4)::text
              else null
            end as coverage_percent,
            case
              when result_covered_kilograms > 0
                then round(weighted_yield_numerator / result_covered_kilograms, 4)::text
              else null
            end as weighted_yield_percent
          from aggregates
        `,
        [access.holdingId, request.params.campaignId],
      );

      const row = result.rows[0];
      if (!row) throw new Error('Campaign summary query returned no row');

      return {
        campaignId: request.params.campaignId,
        deliveriesCount: Number(row.deliveries_count),
        totalKilograms: row.total_kilograms,
        deliveriesWithResult: Number(row.deliveries_with_result),
        pendingResultCount: Number(row.pending_result_count),
        resultCoveredKilograms: row.result_covered_kilograms,
        coveragePercent: row.coverage_percent,
        weightedYieldPercent: row.weighted_yield_percent,
      };
    },
  );
}
