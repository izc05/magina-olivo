import type { FastifyInstance } from 'fastify';
import { getPool } from './db.ts';
import { classifyNewsFreshness } from './news-freshness.ts';
import { normalizePublicHttpsUrl } from './public-directory-trust.ts';

type PublicNewsSourceRow = {
  source_key: string;
  label: string;
  provider: string;
  source_url: string;
  update_frequency: string | null;
  source_updated_at: Date | null;
  last_checked_at: Date | null;
  last_success_at: Date | null;
  last_error: string | null;
};

type PublicNewsItemRow = {
  id: string;
  external_id: string;
  title: string;
  source_url: string;
  published_at: Date;
  topic: string | null;
  featured: boolean;
};

export function registerPublicNewsRoutes(app: FastifyInstance): void {
  app.get('/api/v1/public/news', async (_request, reply) => {
    const sourceResult = await getPool().query<PublicNewsSourceRow>(
      `
        select
          source_key, label, provider, source_url, update_frequency,
          source_updated_at, last_checked_at, last_success_at, last_error
        from public_data_sources
        where source_key = 'junta-agriculture-news'
          and active = true
        limit 1
      `,
    );

    const source = sourceResult.rows[0];
    if (!source) {
      return reply.code(503).send({
        code: 'PUBLIC_NEWS_SOURCE_UNAVAILABLE',
        message: 'Public news source is not registered',
      });
    }

    const itemResult = await getPool().query<PublicNewsItemRow>(
      `
        select id, external_id, title, source_url, published_at, topic, featured
        from public_news_items
        where source_key = $1
          and active = true
          and published_at >= now() - interval '45 days'
        order by featured desc, published_at desc, external_id desc
        limit 12
      `,
      [source.source_key],
    );

    const items = itemResult.rows.flatMap((row) => {
      const sourceUrl = normalizePublicHttpsUrl(row.source_url);
      if (!sourceUrl) return [];
      return [{
        id: row.id,
        externalId: row.external_id,
        title: row.title,
        publishedAt: row.published_at,
        topic: row.topic,
        sourceUrl,
        featured: row.featured,
        freshness: classifyNewsFreshness(row.published_at),
      }];
    });

    return {
      source: {
        key: source.source_key,
        label: source.label,
        provider: source.provider,
        sourceUrl: normalizePublicHttpsUrl(source.source_url),
        updateFrequency: source.update_frequency,
        sourceUpdatedAt: source.source_updated_at,
        lastCheckedAt: source.last_checked_at,
        lastSuccessAt: source.last_success_at,
        hasError: Boolean(source.last_error),
      },
      items,
      policy: 'verified-metadata-only-no-article-copy',
    };
  });
}
