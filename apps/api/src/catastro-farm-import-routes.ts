import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { canWrite, getHoldingAccess } from './authorization.ts';
import {
  duplicateRaceValidation,
  insertPreparedCatastroPlots,
  MAX_CATASTRO_BATCH_SIZE,
  prepareCatastroBatch,
  type ImportParcelInput,
  type ValidationItem,
} from './catastro-import-service.ts';
import { getPool } from './db.ts';
import { apiError } from './http-errors.ts';
import { getAuthenticatedSession } from './session.ts';

type HoldingParams = { holdingId: string };
type CreateFarmAndPlotsBody = {
  farm: { name: string };
  parcels: ImportParcelInput[];
};
type PgError = Error & { code?: string };

function failureResponse(requestId: string, items: ValidationItem[]) {
  return {
    error: {
      code: 'CATASTRO_FARM_BATCH_NOT_READY',
      message: 'No se ha creado la finca ni ninguna parcela. Revisa los avisos y vuelve a intentarlo.',
      requestId,
    },
    created: false,
    items,
  };
}

const parcelSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['cadastralReference', 'name'],
  properties: {
    cadastralReference: { type: 'string', pattern: '^[A-Za-z0-9]{14}$' },
    name: { type: 'string', minLength: 1, maxLength: 120 },
    oliveTreeCount: {
      anyOf: [
        { type: 'integer', minimum: 0, maximum: 100000000 },
        { type: 'null' },
      ],
    },
    irrigationType: {
      anyOf: [
        { type: 'string', enum: ['dryland', 'irrigated', 'mixed', 'unknown'] },
        { type: 'null' },
      ],
    },
    oliveVariety: {
      anyOf: [
        { type: 'string', minLength: 1, maxLength: 80 },
        { type: 'null' },
      ],
    },
    notes: {
      anyOf: [
        { type: 'string', maxLength: 5000 },
        { type: 'null' },
      ],
    },
  },
} as const;

export function registerCatastroFarmImportRoutes(app: FastifyInstance): void {
  app.post<{ Params: HoldingParams; Body: CreateFarmAndPlotsBody }>(
    '/api/v1/holdings/:holdingId/farms/import-catastro',
    {
      schema: {
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['farm', 'parcels'],
          properties: {
            farm: {
              type: 'object',
              additionalProperties: false,
              required: ['name'],
              properties: {
                name: { type: 'string', minLength: 1, maxLength: 120 },
              },
            },
            parcels: {
              type: 'array',
              minItems: 1,
              maxItems: MAX_CATASTRO_BATCH_SIZE,
              items: parcelSchema,
            },
          },
        },
      },
    },
    async (request, reply) => {
      const session = await getAuthenticatedSession(request);
      if (!session) {
        return reply.code(401).send(apiError(request, 'AUTH_REQUIRED', 'Authentication required'));
      }

      const access = await getHoldingAccess(session.user.id, request.params.holdingId);
      if (!access) {
        return reply.code(404).send(apiError(request, 'HOLDING_NOT_FOUND', 'Holding not found'));
      }
      if (!canWrite(access.role)) {
        return reply.code(403).send(apiError(request, 'WRITE_FORBIDDEN', 'Write access required'));
      }

      const farmName = request.body.farm.name.trim();
      if (!farmName) {
        return reply.code(400).send(apiError(request, 'INVALID_FARM_NAME', 'Farm name is required'));
      }

      const batch = await prepareCatastroBatch(
        access.holdingId,
        request.body.parcels,
        (error, cadastralReference) => request.log.warn(
          { err: error, cadastralReference },
          'Catastro farm batch verification failed',
        ),
      );

      if (batch.validationItems.some((item) => item.status !== 'ready')) {
        return reply.code(409).send(failureResponse(request.id, batch.validationItems));
      }

      const client = await getPool().connect();
      try {
        await client.query('begin');
        const farmId = randomUUID();
        const farmResult = await client.query<{
          id: string;
          name: string;
          created_at: Date;
          updated_at: Date;
        }>(
          `insert into farms (id, holding_id, name)
           values ($1, $2, $3)
           returning id, name, created_at, updated_at`,
          [farmId, access.holdingId, farmName],
        );
        const farm = farmResult.rows[0];
        if (!farm) throw new Error('Farm insert returned no row');

        const createdItems = await insertPreparedCatastroPlots(
          client,
          access.holdingId,
          farm.id,
          batch.prepared,
        );

        await client.query('commit');
        return reply.code(201).send({
          created: true,
          farm: {
            id: farm.id,
            name: farm.name,
            description: null,
            areaHa: null,
            createdAt: farm.created_at,
            updatedAt: farm.updated_at,
          },
          items: createdItems,
          source: {
            provider: 'Dirección General del Catastro',
            dataset: 'INSPIRE Cadastral Parcel (CP)',
            verifiedServerSide: true,
          },
        });
      } catch (error) {
        await client.query('rollback');
        const pgError = error as PgError;
        if (pgError.code === '23505') {
          const raced = await getPool().query<{ cadastral_reference: string }>(
            `select cadastral_reference
             from plots
             where holding_id = $1
               and active = true
               and cadastral_reference = any($2::text[])`,
            [access.holdingId, batch.references],
          );
          const racedReferences = new Set(raced.rows.map((row) => row.cadastral_reference));
          return reply.code(409).send(failureResponse(
            request.id,
            duplicateRaceValidation(batch.inputs, racedReferences),
          ));
        }
        throw error;
      } finally {
        client.release();
      }
    },
  );
}
