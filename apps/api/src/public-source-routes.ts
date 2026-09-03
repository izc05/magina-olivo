import type { FastifyInstance } from 'fastify';
import { getPool } from './db.ts';
import { normalizePublicHttpsUrl } from './public-directory-trust.ts';

type PublicSourceRow = {
  source_key: string;
  label: string;
  provider: string;
  source_url: string;
  license_label: string | null;
  update_frequency: string | null;
  source_updated_at: Date | null;
  last_checked_at: Date | null;
  last_success_at: Date | null;
  last_error: string | null;
  metadata: unknown;
};

export function registerPublicSourceRoutes(app: FastifyInstance): void {
  app.get('/api/v1/public/sources', async () => {
    const result = await getPool().query<PublicSourceRow>(
      `
        select
          source_key, label, provider, source_url, license_label,
          update_frequency, source_updated_at, last_checked_at,
          last_success_at, last_error, metadata
        from public_data_sources
        where active = true
        order by source_key
      `,
    );

    return {
      items: result.rows.map((row) => ({
        key: row.source_key,
        label: row.label,
        provider: row.provider,
        sourceUrl: normalizePublicHttpsUrl(row.source_url),
        licenseLabel: row.license_label,
        updateFrequency: row.update_frequency,
        sourceUpdatedAt: row.source_updated_at,
        lastCheckedAt: row.last_checked_at,
        lastSuccessAt: row.last_success_at,
        hasError: Boolean(row.last_error),
        metadata: row.metadata,
      })),
    };
  });
}
