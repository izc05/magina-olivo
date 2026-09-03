import type { FastifyInstance } from 'fastify';
import { getPool } from './db.ts';
import { classifyRaifFreshness } from './raif-freshness.ts';

type RaifSourceRow = {
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

function metadataString(metadata: unknown, key: string): string | null {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return null;
  const value = (metadata as Record<string, unknown>)[key];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function safeHttpsUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function registerPublicFieldAlertRoutes(app: FastifyInstance): void {
  app.get('/api/v1/public/field-alerts', async (_request, reply) => {
    const result = await getPool().query<RaifSourceRow>(
      `
        select
          source_key, label, provider, source_url, license_label,
          update_frequency, source_updated_at, last_checked_at,
          last_success_at, last_error, metadata
        from public_data_sources
        where source_key = 'raif-olivar-observations'
          and active = true
        limit 1
      `,
    );

    const row = result.rows[0];
    if (!row) {
      return reply.code(503).send({
        code: 'RAIF_SOURCE_UNAVAILABLE',
        message: 'RAIF source is not registered',
      });
    }

    const freshness = classifyRaifFreshness(row.source_updated_at);
    const resources = [
      { key: 'dataset', label: 'Datos abiertos RAIF · Olivar', url: safeHttpsUrl(row.source_url) },
      { key: 'olivar', label: 'Actualidad fitosanitaria del olivar', url: safeHttpsUrl(metadataString(row.metadata, 'olivarPage')) },
      { key: 'jaen', label: 'Informes fitosanitarios de Jaén', url: safeHttpsUrl(metadataString(row.metadata, 'jaenReports')) },
      { key: 'baeza', label: 'Seguimiento demostrativo de olivar en Baeza', url: safeHttpsUrl(metadataString(row.metadata, 'baezaDemo')) },
    ].filter((resource): resource is { key: string; label: string; url: string } => Boolean(resource.url));

    return {
      source: {
        key: row.source_key,
        label: row.label,
        provider: row.provider,
        licenseLabel: row.license_label,
        updateFrequency: row.update_frequency,
        sourceUpdatedAt: row.source_updated_at,
        lastCheckedAt: row.last_checked_at,
        lastSuccessAt: row.last_success_at,
        hasError: Boolean(row.last_error),
      },
      freshness,
      scope: {
        crop: metadataString(row.metadata, 'crop') ?? 'olivar',
        coverage: metadataString(row.metadata, 'coverage') ?? 'Andalucía',
        provinceFocus: metadataString(row.metadata, 'provinceFocus') ?? 'Jaén',
      },
      latestDemonstrationObservation: metadataString(row.metadata, 'latestDemonstrationObservation'),
      resources,
      usage: 'regional-fitosanitary-context-not-plot-diagnosis',
    };
  });
}
