import type { FastifyInstance } from 'fastify';
import { parseNaturalLanguageIntent, type ActivityDraft, type DeliveryDraft, type QueryDraft, type ParsedIntentResult } from './ai-parser.ts';
import { parseAlmazaraTicketText } from './ai-ticket-parser.ts';
import { getHoldingAccess } from './authorization.ts';
import { getPool } from './db.ts';
import { apiError } from './http-errors.ts';
import { getAuthenticatedSession } from './session.ts';

type ParseIntentBody = {
  text: string;
  holdingId?: string;
  context?: {
    campaignId?: string;
    farmId?: string;
    plotId?: string;
  };
};

export { parseNaturalLanguageIntent, type ActivityDraft, type DeliveryDraft, type QueryDraft, type ParsedIntentResult };

export function registerAiRoutes(app: FastifyInstance): void {
  // 1. Tool catalog endpoint for AI agents (OpenAPI / MCP tool metadata)
  app.get('/api/v1/ai/tools', async () => {
    return {
      version: '1.0.0',
      description: 'Herramientas de Mágina IA para asistentes y agentes de campo',
      tools: [
        {
          name: 'parse_intent',
          description: 'Interpreta lenguaje natural en español para extraer borradores de labores o entregas',
          parameters: {
            type: 'object',
            required: ['text'],
            properties: {
              text: { type: 'string', description: 'Frase o dictado del agricultor' },
              holdingId: { type: 'string', format: 'uuid', description: 'ID de la explotación opcional' },
            },
          },
        },
        {
          name: 'create_delivery',
          description: 'Registra una entrega de aceituna confirmada en la campaña activa',
          parameters: {
            type: 'object',
            required: ['campaignId', 'deliveredAt', 'kilograms'],
            properties: {
              campaignId: { type: 'string', format: 'uuid' },
              deliveredAt: { type: 'string', format: 'date-time' },
              kilograms: { type: 'string' },
              plotId: { type: 'string', format: 'uuid' },
              customDestination: { type: 'string' },
              ticketNumber: { type: 'string' },
            },
          },
        },
        {
          name: 'create_activity',
          description: 'Anota una labor (tratamiento, poda, riego, abonado, etc.) en el cuaderno de campo',
          parameters: {
            type: 'object',
            required: ['holdingId', 'activityType', 'occurredAt'],
            properties: {
              holdingId: { type: 'string', format: 'uuid' },
              activityType: { type: 'string', enum: ['treatment', 'fertilization', 'pruning', 'mowing', 'tillage', 'irrigation', 'harvest', 'maintenance', 'planting', 'sampling', 'observation', 'other'] },
              occurredAt: { type: 'string', format: 'date-time' },
              farmId: { type: 'string', format: 'uuid' },
              plotId: { type: 'string', format: 'uuid' },
              productName: { type: 'string' },
              quantity: { type: 'number' },
              quantityUnit: { type: 'string' },
              notes: { type: 'string' },
            },
          },
        },
      ],
    };
  });

  // 2. Parse intent endpoint
  app.post<{ Body: ParseIntentBody }>(
    '/api/v1/ai/parse-intent',
    {
      schema: {
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['text'],
          properties: {
            text: { type: 'string', minLength: 1, maxLength: 2000 },
            holdingId: { type: 'string', format: 'uuid' },
            context: {
              type: 'object',
              additionalProperties: false,
              properties: {
                campaignId: { type: 'string', format: 'uuid' },
                farmId: { type: 'string', format: 'uuid' },
                plotId: { type: 'string', format: 'uuid' },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const session = await getAuthenticatedSession(request);
      if (!session) return reply.code(401).send(apiError(request, 'AUTH_REQUIRED', 'Authentication required'));

      let contextPlots: Array<{ id: string; name: string; farmId: string; areaHa: string | null }> = [];
      const holdingId = request.body.holdingId;

      if (holdingId) {
        const access = await getHoldingAccess(session.user.id, holdingId);
        if (access) {
          const plotRows = await getPool().query<{ id: string; name: string; farm_id: string; area_ha: string | null }>(
            `select id, name, farm_id, area_ha from plots where holding_id = $1 and active = true limit 50`,
            [holdingId],
          );
          contextPlots = plotRows.rows.map((row) => ({
            id: row.id,
            name: row.name,
            farmId: row.farm_id,
            areaHa: row.area_ha,
          }));
        }
      }

      const result = parseNaturalLanguageIntent(request.body.text, contextPlots);
      return result;
    },
  );

  // 3. Parse ticket / albarán endpoint
  app.post<{ Body: { text: string } }>(
    '/api/v1/ai/parse-ticket',
    {
      schema: {
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['text'],
          properties: {
            text: { type: 'string', minLength: 1, maxLength: 5000 },
          },
        },
      },
    },
    async (request, reply) => {
      const session = await getAuthenticatedSession(request);
      if (!session) return reply.code(401).send(apiError(request, 'AUTH_REQUIRED', 'Authentication required'));

      return parseAlmazaraTicketText(request.body.text);
    },
  );
}

