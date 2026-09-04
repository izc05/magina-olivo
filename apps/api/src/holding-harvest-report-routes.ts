import type { FastifyInstance, FastifyReply } from 'fastify';
import { getCampaignAccess } from './authorization.ts';
import { getPool } from './db.ts';
import {
  buildHoldingHarvestPdf,
  type HoldingHarvestPlot,
  type HoldingHarvestReportInput,
} from './holding-harvest-report-format.ts';
import { apiError } from './http-errors.ts';
import type { PlotHarvestDelivery } from './plot-harvest-report-format.ts';
import { getAuthenticatedSession } from './session.ts';

type Params = { campaignId: string };

type CampaignRow = {
  holding_name: string;
  municipality: string | null;
  province: string | null;
  campaign_name: string;
  season_start_year: number;
  season_end_year: number;
};

type PlotRow = {
  id: string;
  farm_name: string;
  name: string;
  area_ha: string | null;
  olive_tree_count: number | null;
};

type DeliveryRow = {
  id: string;
  plot_id: string;
  delivered_at: Date;
  kilograms: string;
  cooperative_name: string | null;
  custom_destination: string | null;
  ticket_number: string | null;
  variety: string | null;
  yield_percent: string | null;
  verification_status: string;
  notes: string | null;
};

function filename(startYear: number, endYear: number): string {
  return `magina-olivo-informe-global-${startYear}-${String(endYear).slice(-2)}.pdf`;
}

function privatePdf(reply: FastifyReply, name: string): void {
  reply.header('Cache-Control', 'private, no-store');
  reply.header('Content-Disposition', `attachment; filename="${name}"`);
  reply.type('application/pdf');
}

async function loadReport(userId: string, campaignId: string): Promise<HoldingHarvestReportInput | null> {
  const access = await getCampaignAccess(userId, campaignId);
  if (!access) return null;
  const holdingId = access.holdingId;
  const db = getPool();

  const [campaignResult, plotsResult, deliveriesResult] = await Promise.all([
    db.query<CampaignRow>(
      `
        select
          h.name as holding_name,
          h.municipality,
          h.province,
          c.name as campaign_name,
          c.season_start_year,
          c.season_end_year
        from campaigns c
        join holdings h on h.id = c.holding_id
        where c.id = $1
          and c.holding_id = $2
          and c.status <> 'archived'
          and h.active = true
        limit 1
      `,
      [campaignId, holdingId],
    ),
    db.query<PlotRow>(
      `
        select p.id, f.name as farm_name, p.name, p.area_ha, p.olive_tree_count
        from plots p
        join farms f on f.id = p.farm_id and f.holding_id = p.holding_id
        where p.holding_id = $1
          and p.active = true
          and f.active = true
        order by f.name asc, p.name asc
      `,
      [holdingId],
    ),
    db.query<DeliveryRow>(
      `
        select
          d.id,
          d.plot_id,
          d.delivered_at,
          d.kilograms,
          coop.official_name as cooperative_name,
          d.custom_destination,
          d.ticket_number,
          d.variety,
          current_result.value as yield_percent,
          d.verification_status,
          d.notes
        from deliveries d
        join plots p
          on p.id = d.plot_id
          and p.holding_id = d.holding_id
          and p.active = true
        left join cooperatives coop on coop.id = d.cooperative_id
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
          and d.verification_status <> 'archived'
        order by d.delivered_at asc, d.id asc
      `,
      [holdingId, campaignId],
    ),
  ]);

  const campaign = campaignResult.rows[0];
  if (!campaign) return null;

  const deliveriesByPlot = new Map<string, PlotHarvestDelivery[]>();
  for (const row of deliveriesResult.rows) {
    const item: PlotHarvestDelivery = {
      id: row.id,
      deliveredAt: row.delivered_at.toISOString(),
      kilograms: row.kilograms,
      destination: row.cooperative_name ?? row.custom_destination ?? 'Sin destino',
      ticketNumber: row.ticket_number,
      variety: row.variety,
      yieldPercent: row.yield_percent,
      verificationStatus: row.verification_status,
      notes: row.notes,
    };
    const items = deliveriesByPlot.get(row.plot_id) ?? [];
    items.push(item);
    deliveriesByPlot.set(row.plot_id, items);
  }

  const plots: HoldingHarvestPlot[] = plotsResult.rows.map((plot) => ({
    id: plot.id,
    farmName: plot.farm_name,
    name: plot.name,
    areaHa: plot.area_ha,
    oliveTreeCount: plot.olive_tree_count,
    deliveries: deliveriesByPlot.get(plot.id) ?? [],
  }));

  return {
    generatedAt: new Date().toISOString(),
    holding: {
      name: campaign.holding_name,
      municipality: campaign.municipality,
      province: campaign.province,
    },
    campaign: {
      name: campaign.campaign_name,
      seasonStartYear: campaign.season_start_year,
      seasonEndYear: campaign.season_end_year,
    },
    plots,
  };
}

export function registerHoldingHarvestReportRoutes(app: FastifyInstance): void {
  app.get<{ Params: Params }>(
    '/api/v1/campaigns/:campaignId/harvest-report.pdf',
    async (request, reply) => {
      const session = await getAuthenticatedSession(request);
      if (!session) return reply.code(401).send(apiError(request, 'AUTH_REQUIRED', 'Authentication required'));

      const report = await loadReport(session.user.id, request.params.campaignId);
      if (!report) {
        return reply.code(404).send(apiError(request, 'HOLDING_HARVEST_REPORT_NOT_FOUND', 'Harvest report not found'));
      }

      privatePdf(reply, filename(report.campaign.seasonStartYear, report.campaign.seasonEndYear));
      return reply.send(buildHoldingHarvestPdf(report));
    },
  );
}
