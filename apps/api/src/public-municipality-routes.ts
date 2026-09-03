import type { FastifyInstance } from 'fastify';
import { getPool } from './db.ts';

type MunicipalityRow = {
  slug: string;
  name: string;
  province: string;
  aliases: string[];
  checked_at: Date;
};

export function registerPublicMunicipalityRoutes(app: FastifyInstance): void {
  app.get('/api/v1/public/municipalities', async () => {
    const result = await getPool().query<MunicipalityRow>(
      `
        select slug, name, province, aliases, checked_at
        from public_municipalities
        where active = true
        order by name
      `,
    );

    return {
      items: result.rows.map((row) => ({
        slug: row.slug,
        name: row.name,
        province: row.province,
        aliases: Array.isArray(row.aliases) ? row.aliases : [],
        checkedAt: row.checked_at,
      })),
      source: {
        label: 'AEMET · predicción por municipios',
        checkedAt: '2026-09-03',
      },
    };
  });
}
