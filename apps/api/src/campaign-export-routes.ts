import type { FastifyInstance, FastifyReply } from 'fastify';
import { getCampaignAccess } from './authorization.ts';
import { buildCampaignCsv, type CampaignExportDelivery } from './campaign-export-format.ts';
import { getPool } from './db.ts';
import { apiError } from './http-errors.ts';
import { getAuthenticatedSession } from './session.ts';

type CampaignParams = { campaignId: string };

type CampaignExportRow = {
  id: string;
  name: string;
  season_start_year: number;
  season_end_year: number;
  start_date: string | null;
  end_date: string | null;
  status: string;
  notes: string | null;
  holding_name: string;
  municipality: string | null;
  province: string | null;
};

type DeliveryExportRow = {
  id: string;
  delivered_at: Date;
  kilograms: string;
  cooperative_id: string | null;
  cooperative_name: string | null;
  custom_destination: string | null;
  farm_id: string | null;
  farm_name: string | null;
  plot_id: string | null;
  plot_name: string | null;
  ticket_number: string | null;
  variety: string | null;
  notes: string | null;
  verification_status: string;
  yield_percent: string | null;
};

type CampaignExportPayload = {
  schemaVersion: 1;
  exportedAt: string;
  holding: {
    id: string;
    name: string;
    municipality: string | null;
    province: string | null;
  };
  campaign: {
    id: string;
    name: string;
    seasonStartYear: number;
    seasonEndYear: number;
    startDate: string | null;
    endDate: string | null;
    status: string;
    notes: string | null;
  };
  deliveries: CampaignExportDelivery[];
};

function safeFilename(startYear: number, endYear: number, extension: 'csv' | 'json'): string {
  return `magina-olivo-campana-${startYear}-${String(endYear).slice(-2)}.${extension}`;
}

async function loadCampaignExport(
  userId: string,
  campaignId: string,
): Promise<CampaignExportPayload | null> {
  const access = await getCampaignAccess(userId, campaignId);
  if (!access) return null;

  const db = getPool();
  const [campaignResult, deliveryResult] = await Promise.all([
    db.query<CampaignExportRow>(
      `
        select
          c.id, c.name, c.season_start_year, c.season_end_year,
          c.start_date, c.end_date, c.status, c.notes,
          h.name as holding_name, h.municipality, h.province
        from campaigns c
        join holdings h on h.id = c.holding_id
        where c.id = $1
          and c.holding_id = $2
          and c.status <> 'archived'
          and h.active = true
        limit 1
      `,
      [campaignId, access.holdingId],
    ),
    db.query<DeliveryExportRow>(
      `
        select
          d.id, d.delivered_at, d.kilograms,
          d.cooperative_id, coop.official_name as cooperative_name,
          d.custom_destination,
          d.farm_id, f.name as farm_name,
          d.plot_id, p.name as plot_name,
          d.ticket_number, d.variety, d.notes, d.verification_status,
          current_result.value as yield_percent
        from deliveries d
        left join cooperatives coop on coop.id = d.cooperative_id
        left join farms f
          on f.id = d.farm_id
          and f.holding_id = d.holding_id
        left join plots p
          on p.id = d.plot_id
          and p.holding_id = d.holding_id
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
      [access.holdingId, campaignId],
    ),
  ]);

  const campaign = campaignResult.rows[0];
  if (!campaign) return null;

  return {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    holding: {
      id: access.holdingId,
      name: campaign.holding_name,
      municipality: campaign.municipality,
      province: campaign.province,
    },
    campaign: {
      id: campaign.id,
      name: campaign.name,
      seasonStartYear: campaign.season_start_year,
      seasonEndYear: campaign.season_end_year,
      startDate: campaign.start_date,
      endDate: campaign.end_date,
      status: campaign.status,
      notes: campaign.notes,
    },
    deliveries: deliveryResult.rows.map((row) => ({
      id: row.id,
      deliveredAt: row.delivered_at.toISOString(),
      kilograms: row.kilograms,
      cooperativeId: row.cooperative_id,
      cooperativeName: row.cooperative_name,
      customDestination: row.custom_destination,
      destination: row.cooperative_name ?? row.custom_destination ?? 'Sin destino',
      farmId: row.farm_id,
      farmName: row.farm_name,
      plotId: row.plot_id,
      plotName: row.plot_name,
      ticketNumber: row.ticket_number,
      variety: row.variety,
      yieldPercent: row.yield_percent,
      verificationStatus: row.verification_status,
      notes: row.notes,
    })),
  };
}

function privateDownloadHeaders(reply: FastifyReply, filename: string): void {
  reply.header('Cache-Control', 'private, no-store');
  reply.header('Content-Disposition', `attachment; filename="${filename}"`);
}

export function registerCampaignExportRoutes(app: FastifyInstance): void {
  app.get<{ Params: CampaignParams }>(
    '/api/v1/campaigns/:campaignId/export.json',
    async (request, reply) => {
      const session = await getAuthenticatedSession(request);
      if (!session) {
        return reply.code(401).send(apiError(request, 'AUTH_REQUIRED', 'Authentication required'));
      }

      const payload = await loadCampaignExport(session.user.id, request.params.campaignId);
      if (!payload) {
        return reply.code(404).send(apiError(request, 'CAMPAIGN_NOT_FOUND', 'Campaign not found'));
      }

      privateDownloadHeaders(
        reply,
        safeFilename(payload.campaign.seasonStartYear, payload.campaign.seasonEndYear, 'json'),
      );
      reply.type('application/json; charset=utf-8');
      return reply.send(payload);
    },
  );

  app.get<{ Params: CampaignParams }>(
    '/api/v1/campaigns/:campaignId/export.csv',
    async (request, reply) => {
      const session = await getAuthenticatedSession(request);
      if (!session) {
        return reply.code(401).send(apiError(request, 'AUTH_REQUIRED', 'Authentication required'));
      }

      const payload = await loadCampaignExport(session.user.id, request.params.campaignId);
      if (!payload) {
        return reply.code(404).send(apiError(request, 'CAMPAIGN_NOT_FOUND', 'Campaign not found'));
      }

      privateDownloadHeaders(
        reply,
        safeFilename(payload.campaign.seasonStartYear, payload.campaign.seasonEndYear, 'csv'),
      );
      reply.type('text/csv; charset=utf-8');
      return reply.send(buildCampaignCsv(payload.deliveries));
    },
  );
}
