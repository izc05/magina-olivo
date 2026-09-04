import type { FastifyInstance, FastifyReply } from 'fastify';
import { getCampaignAccess, getPlotAccess } from './authorization.ts';
import { getPool } from './db.ts';
import { apiError } from './http-errors.ts';
import {
  buildPlotHarvestPdf,
  type PlotHarvestDelivery,
  type PlotHarvestDocumentCount,
  type PlotHarvestReportInput,
} from './plot-harvest-report-format.ts';
import { getAuthenticatedSession } from './session.ts';

type PlotHarvestParams = {
  campaignId: string;
  plotId: string;
};

type PlotCampaignRow = {
  holding_name: string;
  municipality: string | null;
  province: string | null;
  farm_name: string;
  plot_name: string;
  area_ha: string | null;
  sigpac_reference: string | null;
  irrigation_type: string | null;
  olive_tree_count: number | null;
  plot_notes: string | null;
  campaign_name: string;
  season_start_year: number;
  season_end_year: number;
  start_date: string | null;
  end_date: string | null;
  campaign_status: string;
};

type PreviousCampaignRow = {
  id: string;
  name: string;
  season_start_year: number;
  season_end_year: number;
};

type PlotDeliveryRow = {
  id: string;
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

type DocumentCountRow = {
  document_type: string;
  document_count: number;
};

function filenamePart(value: string): string {
  const normalized = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return normalized || 'parcela';
}

function reportFilename(plotName: string, startYear: number, endYear: number): string {
  return `magina-olivo-cosecha-${filenamePart(plotName)}-${startYear}-${String(endYear).slice(-2)}.pdf`;
}

function privatePdfHeaders(reply: FastifyReply, filename: string): void {
  reply.header('Cache-Control', 'private, no-store');
  reply.header('Content-Disposition', `attachment; filename="${filename}"`);
  reply.type('application/pdf');
}

function mapDeliveryRows(rows: PlotDeliveryRow[]): PlotHarvestDelivery[] {
  return rows.map((row) => ({
    id: row.id,
    deliveredAt: row.delivered_at.toISOString(),
    kilograms: row.kilograms,
    destination: row.cooperative_name ?? row.custom_destination ?? 'Sin destino',
    ticketNumber: row.ticket_number,
    variety: row.variety,
    yieldPercent: row.yield_percent,
    verificationStatus: row.verification_status,
    notes: row.notes,
  }));
}

async function loadPlotDeliveries(
  holdingId: string,
  campaignId: string,
  plotId: string,
): Promise<PlotHarvestDelivery[]> {
  const db = getPool();
  const result = await db.query<PlotDeliveryRow>(
    `
      select
        d.id,
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
        and d.plot_id = $3
        and d.verification_status <> 'archived'
      order by d.delivered_at asc, d.id asc
    `,
    [holdingId, campaignId, plotId],
  );

  return mapDeliveryRows(result.rows);
}

async function loadPlotHarvestReport(
  userId: string,
  campaignId: string,
  plotId: string,
): Promise<PlotHarvestReportInput | null> {
  const [campaignAccess, plotAccess] = await Promise.all([
    getCampaignAccess(userId, campaignId),
    getPlotAccess(userId, plotId),
  ]);

  if (!campaignAccess || !plotAccess || campaignAccess.holdingId !== plotAccess.holdingId) {
    return null;
  }

  const holdingId = campaignAccess.holdingId;
  const db = getPool();
  const [metadataResult, deliveries, documentResult] = await Promise.all([
    db.query<PlotCampaignRow>(
      `
        select
          h.name as holding_name,
          h.municipality,
          h.province,
          f.name as farm_name,
          p.name as plot_name,
          p.area_ha,
          p.sigpac_reference,
          p.irrigation_type,
          p.olive_tree_count,
          p.notes as plot_notes,
          c.name as campaign_name,
          c.season_start_year,
          c.season_end_year,
          c.start_date,
          c.end_date,
          c.status as campaign_status
        from plots p
        join farms f
          on f.id = p.farm_id
          and f.holding_id = p.holding_id
        join holdings h on h.id = p.holding_id
        join campaigns c
          on c.id = $2
          and c.holding_id = p.holding_id
        where p.holding_id = $1
          and p.id = $3
          and p.active = true
          and f.active = true
          and h.active = true
          and c.status <> 'archived'
        limit 1
      `,
      [holdingId, campaignId, plotId],
    ),
    loadPlotDeliveries(holdingId, campaignId, plotId),
    db.query<DocumentCountRow>(
      `
        select doc.document_type, count(distinct doc.id)::int as document_count
        from documents doc
        join document_links dl
          on dl.document_id = doc.id
          and dl.holding_id = doc.holding_id
        where doc.holding_id = $1
          and (
            (dl.entity_type = 'plot' and dl.entity_id = $3)
            or (
              dl.entity_type = 'delivery'
              and exists (
                select 1
                from deliveries linked_delivery
                where linked_delivery.id = dl.entity_id
                  and linked_delivery.holding_id = $1
                  and linked_delivery.campaign_id = $2
                  and linked_delivery.plot_id = $3
                  and linked_delivery.verification_status <> 'archived'
              )
            )
            or (
              dl.entity_type = 'delivery_result'
              and exists (
                select 1
                from delivery_results linked_result
                join deliveries linked_delivery
                  on linked_delivery.id = linked_result.delivery_id
                  and linked_delivery.holding_id = linked_result.holding_id
                where linked_result.id = dl.entity_id
                  and linked_result.holding_id = $1
                  and linked_delivery.campaign_id = $2
                  and linked_delivery.plot_id = $3
                  and linked_delivery.verification_status <> 'archived'
              )
            )
          )
        group by doc.document_type
        order by doc.document_type asc
      `,
      [holdingId, campaignId, plotId],
    ),
  ]);

  const metadata = metadataResult.rows[0];
  if (!metadata) return null;

  const previousCampaignResult = await db.query<PreviousCampaignRow>(
    `
      select c.id, c.name, c.season_start_year, c.season_end_year
      from campaigns c
      where c.holding_id = $1
        and c.id <> $2
        and c.status <> 'archived'
        and (
          c.season_start_year < $3
          or (c.season_start_year = $3 and c.season_end_year < $4)
        )
      order by c.season_start_year desc, c.season_end_year desc
      limit 1
    `,
    [holdingId, campaignId, metadata.season_start_year, metadata.season_end_year],
  );

  const previousCampaignRow = previousCampaignResult.rows[0] ?? null;
  const previousDeliveries = previousCampaignRow
    ? await loadPlotDeliveries(holdingId, previousCampaignRow.id, plotId)
    : [];

  const documents: PlotHarvestDocumentCount[] = documentResult.rows.map((row) => ({
    type: row.document_type,
    count: row.document_count,
  }));

  return {
    generatedAt: new Date().toISOString(),
    holding: {
      name: metadata.holding_name,
      municipality: metadata.municipality,
      province: metadata.province,
    },
    farm: {
      name: metadata.farm_name,
    },
    plot: {
      name: metadata.plot_name,
      areaHa: metadata.area_ha,
      sigpacReference: metadata.sigpac_reference,
      irrigationType: metadata.irrigation_type,
      oliveTreeCount: metadata.olive_tree_count,
      notes: metadata.plot_notes,
    },
    campaign: {
      name: metadata.campaign_name,
      seasonStartYear: metadata.season_start_year,
      seasonEndYear: metadata.season_end_year,
      startDate: metadata.start_date,
      endDate: metadata.end_date,
      status: metadata.campaign_status,
    },
    previousCampaign: previousCampaignRow && previousDeliveries.length > 0
      ? {
          name: previousCampaignRow.name,
          seasonStartYear: previousCampaignRow.season_start_year,
          seasonEndYear: previousCampaignRow.season_end_year,
          deliveries: previousDeliveries,
        }
      : null,
    deliveries,
    documents,
  };
}

export function registerPlotHarvestReportRoutes(app: FastifyInstance): void {
  app.get<{ Params: PlotHarvestParams }>(
    '/api/v1/campaigns/:campaignId/plots/:plotId/harvest-report.pdf',
    async (request, reply) => {
      const session = await getAuthenticatedSession(request);
      if (!session) {
        return reply.code(401).send(apiError(request, 'AUTH_REQUIRED', 'Authentication required'));
      }

      const report = await loadPlotHarvestReport(
        session.user.id,
        request.params.campaignId,
        request.params.plotId,
      );
      if (!report) {
        return reply.code(404).send(apiError(request, 'PLOT_HARVEST_REPORT_NOT_FOUND', 'Plot harvest report not found'));
      }

      const pdf = buildPlotHarvestPdf(report);
      privatePdfHeaders(
        reply,
        reportFilename(
          report.plot.name,
          report.campaign.seasonStartYear,
          report.campaign.seasonEndYear,
        ),
      );
      return reply.send(pdf);
    },
  );
}
