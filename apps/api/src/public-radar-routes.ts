import type { FastifyInstance } from 'fastify';
import { getPool } from './db.ts';
import { apiError } from './http-errors.ts';

type RadarFrameRow = {
  id: string;
  captured_at: Date;
  provider: string;
  source_product: string;
};

type RadarImageRow = {
  content_type: string;
  image_data: Buffer;
};

type RadarImageParams = { id: string };

export function registerPublicRadarRoutes(app: FastifyInstance): void {
  app.get('/api/v1/public/weather/radar/frames', async () => {
    const result = await getPool().query<RadarFrameRow>(
      `
        select id, captured_at, provider, source_product
        from weather_radar_frames
        order by captured_at asc, id asc
        limit 18
      `,
    );

    const items = result.rows.map((row) => ({
      id: row.id,
      capturedAt: row.captured_at.toISOString(),
      imageUrl: `/api/v1/public/weather/radar/frames/${row.id}/image`,
    }));

    return {
      items,
      playback: {
        automatic: items.length > 1,
        frameCount: items.length,
        scope: 'recent-national-radar-composite',
      },
      source: {
        provider: result.rows.at(-1)?.provider ?? 'AEMET OpenData',
        product: result.rows.at(-1)?.source_product ?? 'national-radar-composite',
        attribution: 'AEMET',
        note: 'Radar de precipitación. No representa una capa de nubosidad por satélite ni un diagnóstico de parcela.',
      },
    };
  });

  app.get<{ Params: RadarImageParams }>(
    '/api/v1/public/weather/radar/frames/:id/image',
    {
      schema: {
        params: {
          type: 'object',
          additionalProperties: false,
          required: ['id'],
          properties: {
            id: {
              type: 'string',
              pattern: '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$',
            },
          },
        },
      },
    },
    async (request, reply) => {
      const result = await getPool().query<RadarImageRow>(
        `
          select content_type, image_data
          from weather_radar_frames
          where id = $1
          limit 1
        `,
        [request.params.id],
      );
      const frame = result.rows[0];
      if (!frame) {
        return reply.code(404).send(apiError(request, 'RADAR_FRAME_NOT_FOUND', 'Radar frame is not available'));
      }

      return reply
        .header('cache-control', 'public, max-age=3600, immutable')
        .type(frame.content_type)
        .send(frame.image_data);
    },
  );
}
