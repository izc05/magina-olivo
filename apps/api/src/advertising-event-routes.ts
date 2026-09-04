import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { getPool } from './db.ts';

type AdvertisingEventType = 'impression' | 'phone_click' | 'whatsapp_click' | 'website_click';
type AdvertisingPlacement = 'directory_card' | 'directory_action';

type AdvertisingEventBody = {
  destinationId: string;
  eventType: AdvertisingEventType;
  contextMunicipality?: string | null;
  placement: AdvertisingPlacement;
};

type EligibleAdvertiserRow = {
  advertiser_id: string;
  sponsorship_id: string;
};

function advertisingIsEnabled(): boolean {
  return process.env.MAGINA_ADVERTISING_ENABLED?.trim().toLowerCase() === 'true';
}

function trimNullable(value: string | null | undefined): string | null {
  const normalized = value?.trim() ?? '';
  return normalized.length > 0 ? normalized : null;
}

export function registerAdvertisingEventRoutes(app: FastifyInstance): void {
  app.post<{ Body: AdvertisingEventBody }>(
    '/api/v1/public/advertising/events',
    {
      schema: {
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['destinationId', 'eventType', 'placement'],
          properties: {
            destinationId: { type: 'string', format: 'uuid' },
            eventType: {
              type: 'string',
              enum: ['impression', 'phone_click', 'whatsapp_click', 'website_click'],
            },
            contextMunicipality: {
              anyOf: [
                { type: 'string', minLength: 1, maxLength: 120 },
                { type: 'null' },
              ],
            },
            placement: {
              type: 'string',
              enum: ['directory_card', 'directory_action'],
            },
          },
        },
      },
    },
    async (request, reply) => {
      if (!advertisingIsEnabled()) {
        return reply.code(204).send();
      }

      const contextMunicipality = trimNullable(request.body.contextMunicipality);
      const values: unknown[] = [request.body.destinationId];
      let areaPredicate = `
        not exists (
          select 1
          from sponsorship_municipalities sm_scope
          where sm_scope.sponsorship_id = sponsorship.id
        )
      `;

      if (contextMunicipality) {
        values.push(contextMunicipality);
        const municipalityParameter = `$${values.length}`;
        areaPredicate = `
          (
            not exists (
              select 1
              from sponsorship_municipalities sm_scope
              where sm_scope.sponsorship_id = sponsorship.id
            )
            or exists (
              select 1
              from sponsorship_municipalities sm_scope
              where sm_scope.sponsorship_id = sponsorship.id
                and lower(sm_scope.municipality) = lower(${municipalityParameter})
            )
          )
        `;
      }

      const eligible = await getPool().query<EligibleAdvertiserRow>(
        `
          select
            ap.id as advertiser_id,
            sponsorship.id as sponsorship_id
          from advertiser_profiles ap
          join lateral (
            select s.*
            from sponsorships s
            where s.advertiser_id = ap.id
              and s.status = 'active'
              and s.plan_code in ('featured', 'premium')
              and (s.starts_at is null or s.starts_at <= now())
              and (s.ends_at is null or s.ends_at > now())
              and ${areaPredicate.replaceAll('sponsorship.', 's.')}
            order by s.priority_override desc nulls last, s.updated_at desc
            limit 1
          ) sponsorship on true
          where ap.destination_id = $1
            and ap.status = 'active'
          limit 1
        `,
        values,
      );

      const row = eligible.rows[0];
      if (!row) {
        return reply.code(204).send();
      }

      await getPool().query(
        `
          insert into advertising_events (
            id, advertiser_id, sponsorship_id, event_type, municipality, placement
          )
          values ($1, $2, $3, $4, $5, $6)
        `,
        [
          randomUUID(),
          row.advertiser_id,
          row.sponsorship_id,
          request.body.eventType,
          contextMunicipality,
          request.body.placement,
        ],
      );

      return reply.code(204).send();
    },
  );
}
