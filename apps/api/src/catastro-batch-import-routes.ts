import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { canWrite, getFarmAccess } from './authorization.ts';
import { fetchCatastroParcelByReference, validateCadastralReference, type CatastroParcel } from './catastro-client.ts';
import { getPool } from './db.ts';
import { apiError } from './http-errors.ts';
import { validateBoundary, type GeoJsonPolygon } from './plot-boundary-geometry.ts';
import { getAuthenticatedSession } from './session.ts';

type FarmParams = { farmId: string };
type IrrigationType = 'dryland' | 'irrigated' | 'mixed' | 'unknown';
type ImportParcelInput = {
  cadastralReference: string;
  name: string;
  oliveTreeCount?: number | null;
  irrigationType?: IrrigationType | null;
  notes?: string | null;
};
type BatchImportBody = { parcels: ImportParcelInput[] };
type ValidationStatus = 'ready' | 'duplicate' | 'unsupported' | 'upstream-error' | 'invalid';
type ValidationItem = {
  cadastralReference: string;
  status: ValidationStatus;
  message?: string;
};
type PreparedParcel = {
  input: ImportParcelInput;
  official: CatastroParcel;
  boundary: GeoJsonPolygon;
  boundaryAreaHa: number;
  latitude: number;
  longitude: number;
};

type PgError = Error & { code?: string };

const MAX_BATCH_SIZE = 10;

function normalizeReference(reference: string): string {
  return reference.trim().toUpperCase();
}

function simplePolygon(geometry: CatastroParcel['geometry']): GeoJsonPolygon | null {
  if (geometry.type !== 'Polygon') return null;
  const coordinates = geometry.coordinates as number[][][];
  if (coordinates.length !== 1 || !Array.isArray(coordinates[0]) || coordinates[0].length < 4) return null;
  return { type: 'Polygon', coordinates };
}

function polygonCenter(boundary: GeoJsonPolygon): { latitude: number; longitude: number } | null {
  const ring = boundary.coordinates[0];
  if (!ring || ring.length < 4) return null;
  const positions = ring.slice(0, -1).flatMap((position) => {
    const longitude = Number(position[0]);
    const latitude = Number(position[1]);
    return Number.isFinite(longitude) && Number.isFinite(latitude) ? [[longitude, latitude] as const] : [];
  });
  if (!positions.length) return null;
  const sums = positions.reduce(
    (accumulator, [longitude, latitude]) => ({
      longitude: accumulator.longitude + longitude,
      latitude: accumulator.latitude + latitude,
    }),
    { longitude: 0, latitude: 0 },
  );
  return {
    longitude: sums.longitude / positions.length,
    latitude: sums.latitude / positions.length,
  };
}

function failureResponse(requestId: string, items: ValidationItem[]) {
  return {
    error: {
      code: 'CATASTRO_BATCH_NOT_READY',
      message: 'No se ha creado ninguna parcela. Revisa las referencias indicadas y vuelve a intentarlo.',
      requestId,
    },
    created: false,
    items,
  };
}

export function registerCatastroBatchImportRoutes(app: FastifyInstance): void {
  app.post<{ Params: FarmParams; Body: BatchImportBody }>(
    '/api/v1/farms/:farmId/plots/import-catastro',
    {
      schema: {
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['parcels'],
          properties: {
            parcels: {
              type: 'array',
              minItems: 1,
              maxItems: MAX_BATCH_SIZE,
              items: {
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
                  notes: {
                    anyOf: [
                      { type: 'string', maxLength: 5000 },
                      { type: 'null' },
                    ],
                  },
                },
              },
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

      const access = await getFarmAccess(session.user.id, request.params.farmId);
      if (!access) {
        return reply.code(404).send(apiError(request, 'FARM_NOT_FOUND', 'Farm not found'));
      }
      if (!canWrite(access.role)) {
        return reply.code(403).send(apiError(request, 'WRITE_FORBIDDEN', 'Write access required'));
      }

      const inputs = request.body.parcels.map((parcel) => ({
        ...parcel,
        cadastralReference: normalizeReference(parcel.cadastralReference),
        name: parcel.name.trim(),
        notes: parcel.notes?.trim() || null,
      }));
      const inputReferenceCounts = new Map<string, number>();
      for (const input of inputs) {
        inputReferenceCounts.set(input.cadastralReference, (inputReferenceCounts.get(input.cadastralReference) ?? 0) + 1);
      }

      const references = [...new Set(inputs.map((input) => input.cadastralReference))];
      const existing = await getPool().query<{ cadastral_reference: string }>(
        `select cadastral_reference
         from plots
         where holding_id = $1
           and active = true
           and cadastral_reference = any($2::text[])`,
        [access.holdingId, references],
      );
      const existingReferences = new Set(existing.rows.map((row) => row.cadastral_reference));

      const prepared = new Map<string, PreparedParcel>();
      const validationByReference = new Map<string, ValidationItem>();

      for (const input of inputs) {
        const reference = input.cadastralReference;
        if (validationByReference.has(reference)) continue;
        if (!input.name) {
          validationByReference.set(reference, { cadastralReference: reference, status: 'invalid', message: 'El nombre de la parcela es obligatorio.' });
          continue;
        }
        if (!validateCadastralReference(reference)) {
          validationByReference.set(reference, { cadastralReference: reference, status: 'invalid', message: 'Referencia catastral no válida.' });
          continue;
        }
        if ((inputReferenceCounts.get(reference) ?? 0) > 1) {
          validationByReference.set(reference, { cadastralReference: reference, status: 'duplicate', message: 'La misma referencia aparece más de una vez en este lote.' });
          continue;
        }
        if (existingReferences.has(reference)) {
          validationByReference.set(reference, { cadastralReference: reference, status: 'duplicate', message: 'Esta referencia ya está añadida a la explotación.' });
          continue;
        }

        let official: CatastroParcel;
        try {
          official = await fetchCatastroParcelByReference(reference);
        } catch (error) {
          request.log.warn({ err: error, cadastralReference: reference }, 'Catastro batch verification failed');
          validationByReference.set(reference, { cadastralReference: reference, status: 'upstream-error', message: 'Catastro no ha podido verificar esta referencia.' });
          continue;
        }

        const boundary = simplePolygon(official.geometry);
        if (!boundary) {
          validationByReference.set(reference, { cadastralReference: reference, status: 'unsupported', message: 'La geometría oficial es compleja y todavía no se puede importar automáticamente.' });
          continue;
        }
        const boundaryValidation = validateBoundary(boundary);
        if (!boundaryValidation.ok) {
          validationByReference.set(reference, { cadastralReference: reference, status: 'unsupported', message: 'La geometría oficial no supera la validación de Mágina Olivo.' });
          continue;
        }
        const center = polygonCenter(boundary);
        if (!center) {
          validationByReference.set(reference, { cadastralReference: reference, status: 'unsupported', message: 'No se ha podido obtener una ubicación válida para la parcela.' });
          continue;
        }

        prepared.set(reference, {
          input,
          official,
          boundary,
          boundaryAreaHa: Number(boundaryValidation.areaHa.toFixed(4)),
          latitude: center.latitude,
          longitude: center.longitude,
        });
        validationByReference.set(reference, { cadastralReference: reference, status: 'ready' });
      }

      const validationItems = inputs.map((input) => validationByReference.get(input.cadastralReference) ?? ({
        cadastralReference: input.cadastralReference,
        status: 'invalid' as const,
        message: 'No se ha podido validar la referencia.',
      }));
      if (validationItems.some((item) => item.status !== 'ready')) {
        return reply.code(409).send(failureResponse(request.id, validationItems));
      }

      const client = await getPool().connect();
      try {
        await client.query('begin');
        const createdItems: Array<{
          id: string;
          name: string;
          cadastralReference: string;
          boundaryAreaHa: number;
          latitude: number;
          longitude: number;
          oliveTreeCount: number | null;
          irrigationType: IrrigationType | null;
          boundarySourceCheckedAt: Date;
        }> = [];

        for (const input of inputs) {
          const item = prepared.get(input.cadastralReference)!;
          const checkedAt = new Date();
          const id = randomUUID();
          const inserted = await client.query<{
            id: string;
            name: string;
            cadastral_reference: string;
            boundary_area_ha: string;
            latitude: number;
            longitude: number;
            olive_tree_count: number | null;
            irrigation_type: IrrigationType | null;
            boundary_source_checked_at: Date;
          }>(
            `insert into plots (
               id, holding_id, farm_id, name,
               latitude, longitude, irrigation_type, olive_tree_count, notes,
               boundary_geojson, boundary_area_ha, boundary_source,
               boundary_updated_at, boundary_external_id, boundary_source_checked_at,
               cadastral_reference
             )
             values (
               $1, $2, $3, $4,
               $5, $6, $7, $8, $9,
               $10::jsonb, $11, 'catastro',
               $12, $13, $12,
               $13
             )
             returning id, name, cadastral_reference, boundary_area_ha, latitude, longitude,
                       olive_tree_count, irrigation_type, boundary_source_checked_at`,
            [
              id,
              access.holdingId,
              request.params.farmId,
              item.input.name,
              item.latitude,
              item.longitude,
              item.input.irrigationType ?? null,
              item.input.oliveTreeCount ?? null,
              item.input.notes ?? null,
              JSON.stringify(item.boundary),
              item.boundaryAreaHa,
              checkedAt,
              item.official.nationalCadastralReference,
            ],
          );
          const row = inserted.rows[0];
          if (!row) throw new Error('Catastro plot insert returned no row');
          createdItems.push({
            id: row.id,
            name: row.name,
            cadastralReference: row.cadastral_reference,
            boundaryAreaHa: Number(row.boundary_area_ha),
            latitude: row.latitude,
            longitude: row.longitude,
            oliveTreeCount: row.olive_tree_count,
            irrigationType: row.irrigation_type,
            boundarySourceCheckedAt: row.boundary_source_checked_at,
          });
        }

        await client.query('commit');
        return reply.code(201).send({
          created: true,
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
            [access.holdingId, references],
          );
          const racedReferences = new Set(raced.rows.map((row) => row.cadastral_reference));
          const statuses = inputs.map((input) => racedReferences.has(input.cadastralReference)
            ? { cadastralReference: input.cadastralReference, status: 'duplicate' as const, message: 'La referencia se añadió mientras se procesaba este lote.' }
            : { cadastralReference: input.cadastralReference, status: 'ready' as const });
          return reply.code(409).send(failureResponse(request.id, statuses));
        }
        throw error;
      } finally {
        client.release();
      }
    },
  );
}
