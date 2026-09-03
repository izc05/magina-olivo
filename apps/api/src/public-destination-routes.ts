import type { FastifyInstance } from 'fastify';
import { getPool } from './db.ts';

type EntityType = 'cooperative' | 'sat' | 'company' | 'other';

type DestinationQuery = {
  q?: string;
  municipality?: string;
  entityType?: EntityType;
};

type DestinationRow = {
  id: string;
  official_name: string;
  brand_name: string | null;
  entity_type: EntityType;
  municipality: string | null;
  province: string | null;
  website_url: string | null;
  source_url: string | null;
  source_checked_at: Date | null;
  verification_status: 'unverified' | 'verified' | 'stale';
};

export function registerPublicDestinationRoutes(app: FastifyInstance): void {
  app.get<{ Querystring: DestinationQuery }>(
    '/api/v1/public/destinations',
    {
      schema: {
        querystring: {
          type: 'object',
          additionalProperties: false,
          properties: {
            q: { type: 'string', maxLength: 120 },
            municipality: { type: 'string', maxLength: 120 },
            entityType: {
              type: 'string',
              enum: ['cooperative', 'sat', 'company', 'other'],
            },
          },
        },
      },
    },
    async (request) => {
      const values: unknown[] = [];
      const filters = ["verification_status <> 'stale'"];
      const q = request.query.q?.trim();
      const municipality = request.query.municipality?.trim();

      if (q) {
        values.push(`%${q}%`);
        filters.push(`(
          official_name ilike $${values.length}
          or coalesce(brand_name, '') ilike $${values.length}
          or coalesce(municipality, '') ilike $${values.length}
        )`);
      }

      if (municipality) {
        values.push(municipality);
        filters.push(`municipality = $${values.length}`);
      }

      if (request.query.entityType) {
        values.push(request.query.entityType);
        filters.push(`entity_type = $${values.length}`);
      }

      const result = await getPool().query<DestinationRow>(
        `
          select
            id, official_name, brand_name, entity_type, municipality, province,
            website_url, source_url, source_checked_at, verification_status
          from cooperatives
          where ${filters.join(' and ')}
          order by municipality nulls last, official_name
        `,
        values,
      );

      const municipalities = await getPool().query<{ municipality: string }>(
        `
          select distinct municipality
          from cooperatives
          where municipality is not null
            and verification_status <> 'stale'
          order by municipality
        `,
      );

      return {
        items: result.rows.map((row) => ({
          id: row.id,
          officialName: row.official_name,
          brandName: row.brand_name,
          entityType: row.entity_type,
          municipality: row.municipality,
          province: row.province,
          websiteUrl: row.website_url,
          sourceUrl: row.source_url,
          sourceCheckedAt: row.source_checked_at,
          verificationStatus: row.verification_status,
        })),
        municipalities: municipalities.rows.map((row) => row.municipality),
        source: {
          label: 'Directorio DOP Sierra Mágina',
          checkedAt: '2026-09-02',
        },
      };
    },
  );
}
