import type { FastifyInstance } from 'fastify';
import { getPlotAccess } from './authorization.ts';
import { getPool } from './db.ts';
import { apiError } from './http-errors.ts';
import { getAuthenticatedSession } from './session.ts';

type PlotParams = { plotId: string };

type TimelineRow = {
  event_type: 'delivery' | 'yield_result';
  event_id: string;
  occurred_at: Date;
  delivery_id: string;
  kilograms: string | null;
  destination: string | null;
  ticket_number: string | null;
  yield_value: string | null;
};

export function registerPlotTimelineRoutes(app: FastifyInstance): void {
  app.get<{ Params: PlotParams }>(
    '/api/v1/plots/:plotId/timeline',
    async (request, reply) => {
      const session = await getAuthenticatedSession(request);
      if (!session) {
        return reply.code(401).send(apiError(request, 'AUTH_REQUIRED', 'Authentication required'));
      }

      const access = await getPlotAccess(session.user.id, request.params.plotId);
      if (!access) {
        return reply.code(404).send(apiError(request, 'PLOT_NOT_FOUND', 'Plot not found'));
      }

      const result = await getPool().query<TimelineRow>(
        `
          with plot_deliveries as (
            select
              d.id,
              d.holding_id,
              d.delivered_at,
              d.kilograms,
              coalesce(c.official_name, d.custom_destination) as destination,
              d.ticket_number
            from deliveries d
            left join cooperatives c on c.id = d.cooperative_id
            where d.holding_id = $1
              and d.plot_id = $2
              and d.verification_status <> 'archived'
          )
          select
            'delivery'::text as event_type,
            d.id as event_id,
            d.delivered_at as occurred_at,
            d.id as delivery_id,
            d.kilograms,
            d.destination,
            d.ticket_number,
            null::numeric as yield_value
          from plot_deliveries d

          union all

          select
            'yield_result'::text as event_type,
            r.id as event_id,
            coalesce(r.measured_at, r.created_at) as occurred_at,
            r.delivery_id,
            null::numeric as kilograms,
            null::text as destination,
            null::text as ticket_number,
            r.value as yield_value
          from delivery_results r
          join plot_deliveries d on d.id = r.delivery_id
          where r.holding_id = $1
            and r.result_type = 'fat_yield'
            and r.status = 'current'

          order by occurred_at desc, event_type asc, event_id asc
        `,
        [access.holdingId, request.params.plotId],
      );

      return {
        items: result.rows.map((row) => ({
          type: row.event_type,
          id: row.event_id,
          occurredAt: row.occurred_at,
          deliveryId: row.delivery_id,
          ...(row.kilograms !== null ? { kilograms: row.kilograms } : {}),
          ...(row.destination !== null ? { destination: row.destination } : {}),
          ...(row.ticket_number !== null ? { ticketNumber: row.ticket_number } : {}),
          ...(row.yield_value !== null ? { yieldPercent: row.yield_value } : {}),
        })),
      };
    },
  );
}
