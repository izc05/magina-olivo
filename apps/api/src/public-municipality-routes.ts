import type { FastifyInstance } from 'fastify';
import { getPool } from './db.ts';
import { normalizePublicHttpsUrl } from './public-directory-trust.ts';

type MunicipalityRow = {
  slug: string;
  name: string;
  province: string;
  aliases: string[];
  checked_at: Date;
  hero_image_url: string | null;
  hero_image_source_url: string | null;
  hero_image_credit: string | null;
  hero_image_alt: string | null;
  hero_image_license: string;
  hero_image_status: string;
};

function canPublishImage(row: MunicipalityRow): boolean {
  return row.hero_image_status === 'approved'
    && ['owned', 'licensed', 'official_reusable'].includes(row.hero_image_license);
}

export function registerPublicMunicipalityRoutes(app: FastifyInstance): void {
  app.get('/api/v1/public/municipalities', async () => {
    const result = await getPool().query<MunicipalityRow>(
      `
        select slug, name, province, aliases, checked_at,
          hero_image_url, hero_image_source_url, hero_image_credit, hero_image_alt,
          hero_image_license, hero_image_status
        from public_municipalities
        where active = true
        order by name
      `,
    );

    return {
      items: result.rows.map((row) => {
        const publishImage = canPublishImage(row);
        return {
          slug: row.slug,
          name: row.name,
          province: row.province,
          aliases: Array.isArray(row.aliases) ? row.aliases : [],
          hero: publishImage ? {
            imageUrl: normalizePublicHttpsUrl(row.hero_image_url),
            sourceUrl: normalizePublicHttpsUrl(row.hero_image_source_url),
            credit: row.hero_image_credit,
            alt: row.hero_image_alt || `Vista de ${row.name}, Sierra Mágina`,
          } : null,
          checkedAt: row.checked_at,
        };
      }),
      source: {
        label: 'AEMET · predicción por municipios',
        checkedAt: '2026-09-03',
      },
    };
  });
}