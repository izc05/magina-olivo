import type { FastifyInstance } from 'fastify';
import { getPool } from './db.ts';
import {
  effectiveDirectoryVerificationStatus,
  normalizePublicHttpsUrl,
} from './public-directory-trust.ts';

type EntityType = 'cooperative' | 'sat' | 'company' | 'other';
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
  advertising_category: AdvertisingCategory | null;
  advertising_description: string | null;
  advertising_phone: string | null;
  advertising_whatsapp_phone: string | null;
  advertising_logo_url: string | null;
  advertising_hero_image_url: string | null;
  sponsored: boolean;
  sponsorship_label: string | null;
  sponsorship_plan_code: 'featured' | 'premium' | null;
  sponsorship_priority: number;
};

type PublicSourceRow = {
  label: string;
  provider: string;
  source_url: string;
  last_checked_at: Date | null;
};

function advertisingIsEnabled(): boolean {
  return process.env.MAGINA_ADVERTISING_ENABLED?.trim().toLowerCase() === 'true';
}

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
      const filters = ["c.verification_status <> 'stale'"];
      const q = request.query.q?.trim();
      const municipality = request.query.municipality?.trim();
      const advertisingEnabled = advertisingIsEnabled();

      if (q) {
        values.push(`%${q}%`);
        filters.push(`(
          c.official_name ilike $${values.length}
          or coalesce(c.brand_name, '') ilike $${values.length}
          or coalesce(c.municipality, '') ilike $${values.length}
        )`);
      }

      if (municipality) {
        values.push(municipality);
        filters.push(`c.municipality = $${values.length}`);
      }

      if (request.query.entityType) {
        values.push(request.query.entityType);
        filters.push(`c.entity_type = $${values.length}`);
      }

      const commercialSelect = advertisingEnabled
        ? `
          ap.category as advertising_category,
          ap.description as advertising_description,
          ap.phone as advertising_phone,
          ap.whatsapp_phone as advertising_whatsapp_phone,
          ap.logo_url as advertising_logo_url,
          ap.hero_image_url as advertising_hero_image_url,
          (s.id is not null) as sponsored,
          s.public_label as sponsorship_label,
          case when s.plan_code in ('featured', 'premium') then s.plan_code else null end as sponsorship_plan_code,
          coalesce(s.priority_override, plan.priority, 0) as sponsorship_priority
        `
        : `
          null::text as advertising_category,
          null::text as advertising_description,
          null::text as advertising_phone,
          null::text as advertising_whatsapp_phone,
          null::text as advertising_logo_url,
          null::text as advertising_hero_image_url,
          false as sponsored,
          null::text as sponsorship_label,
          null::text as sponsorship_plan_code,
          0 as sponsorship_priority
        `;

      const commercialJoins = advertisingEnabled
        ? `
          left join advertiser_profiles ap
            on ap.destination_id = c.id
           and ap.status = 'active'
          left join lateral (
            select sponsorship.*
            from sponsorships sponsorship
            where sponsorship.advertiser_id = ap.id
              and sponsorship.status = 'active'
              and (sponsorship.starts_at is null or sponsorship.starts_at <= now())
              and (sponsorship.ends_at is null or sponsorship.ends_at > now())
              and sponsorship.plan_code in ('featured', 'premium')
            order by sponsorship.priority_override desc nulls last, sponsorship.updated_at desc
            limit 1
          ) s on true
          left join advertising_plans plan on plan.code = s.plan_code and plan.active = true
        `
        : '';

      const [result, municipalities, sourceResult] = await Promise.all([
        getPool().query<DestinationRow>(
          `
            select
              c.id, c.official_name, c.brand_name, c.entity_type, c.municipality, c.province,
              c.website_url, c.source_url, c.source_checked_at, c.verification_status,
              ${commercialSelect}
            from cooperatives c
            ${commercialJoins}
            where ${filters.join(' and ')}
            order by sponsorship_priority desc, c.municipality nulls last, c.official_name
          `,
          values,
        ),
        getPool().query<{ municipality: string }>(
          `
            select distinct municipality
            from cooperatives
            where municipality is not null
              and verification_status <> 'stale'
            order by municipality
          `,
        ),
        getPool().query<PublicSourceRow>(
          `
            select label, provider, source_url, last_checked_at
            from public_data_sources
            where source_key = 'dop-sierra-magina-destinations'
              and active = true
            limit 1
          `,
        ),
      ]);

      const source = sourceResult.rows[0] ?? null;
      const latestItemCheck = result.rows.reduce<Date | null>((latest, row) => {
        if (!row.source_checked_at) return latest;
        if (!latest || row.source_checked_at.getTime() > latest.getTime()) return row.source_checked_at;
        return latest;
      }, null);

      return {
        advertisingEnabled,
        items: result.rows.map((row) => ({
          id: row.id,
          officialName: row.official_name,
          brandName: row.brand_name,
          entityType: row.entity_type,
          municipality: row.municipality,
          province: row.province,
          websiteUrl: normalizePublicHttpsUrl(row.website_url),
          sourceUrl: normalizePublicHttpsUrl(row.source_url),
          sourceCheckedAt: row.source_checked_at,
          verificationStatus: effectiveDirectoryVerificationStatus(
            row.verification_status,
            row.source_checked_at,
          ),
          commercial: advertisingEnabled && row.advertising_category ? {
            category: row.advertising_category,
            description: row.advertising_description,
            phone: row.advertising_phone,
            whatsappPhone: row.advertising_whatsapp_phone,
            logoUrl: normalizePublicHttpsUrl(row.advertising_logo_url),
            heroImageUrl: normalizePublicHttpsUrl(row.advertising_hero_image_url),
          } : null,
          sponsorship: advertisingEnabled && row.sponsored ? {
            sponsored: true,
            label: row.sponsorship_label ?? 'Patrocinado',
            planCode: row.sponsorship_plan_code,
            priority: row.sponsorship_priority,
          } : null,
        })),
        municipalities: municipalities.rows.map((row) => row.municipality),
        source: {
          label: source?.label ?? 'Directorio público de Sierra Mágina',
          provider: source?.provider ?? null,
          sourceUrl: normalizePublicHttpsUrl(source?.source_url),
          checkedAt: source?.last_checked_at ?? latestItemCheck,
        },
      };
    },
  );
}
