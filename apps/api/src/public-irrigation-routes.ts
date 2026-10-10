import type { FastifyInstance } from 'fastify';
import { getPool } from './db.ts';

type IrrigationCommunityRow = {
  id: string;
  official_name: string;
  short_name: string | null;
  entity_type: 'community_of_irrigation' | 'sat_irrigation' | 'acequia_association' | 'other';
  primary_municipality_slug: string;
  covered_municipality_slugs: unknown;
  address: string | null;
  phone: string | null;
  email: string | null;
  website_url: string | null;
  electronic_seat_url: string | null;
  verification_status: 'candidate' | 'verified' | 'collaborating';
  source_bulletin_ref: string | null;
  last_checked_at: Date;
};

type CommunityWaterNoticeRow = {
  id: string;
  community_id: string;
  sector_id: string | null;
  notice_type: 'shift_schedule' | 'water_cut' | 'schedule_change' | 'general_notice';
  title: string;
  body: string;
  starts_at: Date;
  ends_at: Date;
  source_type: 'community_verified' | 'public_bulletin' | 'manual_unverified';
  source_url: string | null;
  status: 'draft' | 'published' | 'revoked' | 'expired';
  published_at: Date;
  expires_at: Date | null;
};

type IrrigationQuery = {
  q?: string;
  municipality?: string;
};

type NoticeQuery = {
  status?: 'published' | 'revoked' | 'expired' | 'all';
};

export function registerPublicIrrigationRoutes(app: FastifyInstance): void {
  // Lista de comunidades de regantes públicas por municipio o término de búsqueda
  app.get<{ Querystring: IrrigationQuery }>(
    '/api/v1/public/irrigation-communities',
    {
      schema: {
        querystring: {
          type: 'object',
          additionalProperties: false,
          properties: {
            q: { type: 'string', maxLength: 120 },
            municipality: { type: 'string', maxLength: 120 },
          },
        },
      },
    },
    async (request) => {
      const values: unknown[] = [];
      const filters = ['active = true'];
      const q = request.query.q?.trim();
      const municipality = request.query.municipality?.trim();

      if (q) {
        values.push(`%${q}%`);
        filters.push(`(
          official_name ilike $${values.length}
          or coalesce(short_name, '') ilike $${values.length}
          or primary_municipality_slug ilike $${values.length}
        )`);
      }

      if (municipality) {
        values.push(municipality);
        filters.push(`(
          primary_municipality_slug = $${values.length}
          or covered_municipality_slugs @> jsonb_build_array($${values.length}::text)
        )`);
      }

      const result = await getPool().query<IrrigationCommunityRow>(
        `
          select
            id, official_name, short_name, entity_type, primary_municipality_slug,
            covered_municipality_slugs, address, phone, email, website_url,
            electronic_seat_url, verification_status, source_bulletin_ref, last_checked_at
          from irrigation_communities
          where ${filters.join(' and ')}
          order by primary_municipality_slug, official_name
        `,
        values,
      );

      return {
        items: result.rows.map((row) => ({
          id: row.id,
          officialName: row.official_name,
          shortName: row.short_name,
          entityType: row.entity_type,
          primaryMunicipalitySlug: row.primary_municipality_slug,
          coveredMunicipalitySlugs: Array.isArray(row.covered_municipality_slugs)
            ? row.covered_municipality_slugs
            : [],
          address: row.address,
          phone: row.phone,
          email: row.email,
          websiteUrl: row.website_url,
          electronicSeatUrl: row.electronic_seat_url,
          verificationStatus: row.verification_status,
          sourceBulletinRef: row.source_bulletin_ref,
          lastCheckedAt: row.last_checked_at,
        })),
        source: {
          label: 'Directorio público de Comunidades de Regantes (BOE / BOP Jaén / CHG)',
          checkedAt: '2026-10-10',
        },
      };
    },
  );

  // Avisos y turnos comunitarios de riego de una comunidad concreta
  app.get<{ Params: { id: string }; Querystring: NoticeQuery }>(
    '/api/v1/public/irrigation-communities/:id/notices',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        querystring: {
          type: 'object',
          additionalProperties: false,
          properties: {
            status: {
              type: 'string',
              enum: ['published', 'revoked', 'expired', 'all'],
            },
          },
        },
      },
    },
    async (request, reply) => {
      const communityId = request.params.id;
      const statusFilter = request.query.status ?? 'published';

      // Verificar que la comunidad existe
      const communityCheck = await getPool().query(
        `select id, official_name from irrigation_communities where id = $1 and active = true`,
        [communityId],
      );

      if (communityCheck.rowCount === 0) {
        return reply.code(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: 'Comunidad de regantes no encontrada o inactiva',
        });
      }

      const values: unknown[] = [communityId];
      const filters = ['community_id = $1'];

      if (statusFilter !== 'all') {
        values.push(statusFilter);
        filters.push(`status = $${values.length}`);
      }

      const result = await getPool().query<CommunityWaterNoticeRow>(
        `
          select
            id, community_id, sector_id, notice_type, title, body,
            starts_at, ends_at, source_type, source_url, status,
            published_at, expires_at
          from community_water_notices
          where ${filters.join(' and ')}
          order by starts_at desc
        `,
        values,
      );

      return {
        communityId,
        officialName: communityCheck.rows[0].official_name,
        notices: result.rows.map((row) => ({
          id: row.id,
          communityId: row.community_id,
          sectorId: row.sector_id,
          noticeType: row.notice_type,
          title: row.title,
          body: row.body,
          startsAt: row.starts_at,
          endsAt: row.ends_at,
          sourceType: row.source_type,
          sourceUrl: row.source_url,
          status: row.status,
          publishedAt: row.published_at,
          expiresAt: row.expires_at,
        })),
      };
    },
  );
}
