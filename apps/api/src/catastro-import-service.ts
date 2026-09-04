import { randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';
import { fetchCatastroParcelByReference, validateCadastralReference, type CatastroParcel } from './catastro-client.ts';
import { getPool } from './db.ts';
import { validateBoundary, type GeoJsonPolygon } from './plot-boundary-geometry.ts';

export type IrrigationType = 'dryland' | 'irrigated' | 'mixed' | 'unknown';

export type ImportParcelInput = {
  cadastralReference: string;
  name: string;
  oliveTreeCount?: number | null;
  irrigationType?: IrrigationType | null;
  oliveVariety?: string | null;
  notes?: string | null;
};

export type ValidationStatus = 'ready' | 'duplicate' | 'unsupported' | 'upstream-error' | 'invalid';

export type ValidationItem = {
  cadastralReference: string;
  status: ValidationStatus;
  message?: string;
};

export type PreparedParcel = {
  input: ImportParcelInput;
  official: CatastroParcel;
  boundary: GeoJsonPolygon;
  boundaryAreaHa: number;
  latitude: number;
  longitude: number;
};

export type CreatedCatastroPlot = {
  id: string;
  name: string;
  cadastralReference: string;
  boundaryAreaHa: number;
  latitude: number;
  longitude: number;
  oliveTreeCount: number | null;
  irrigationType: IrrigationType | null;
  oliveVariety: string | null;
  boundarySourceCheckedAt: Date;
};

export type PreparedCatastroBatch = {
  inputs: ImportParcelInput[];
  references: string[];
  prepared: PreparedParcel[];
  validationItems: ValidationItem[];
};

export const MAX_CATASTRO_BATCH_SIZE = 10;

function normalizeReference(reference: string): string {
  return reference.trim().toUpperCase();
}

function normalizeInput(parcel: ImportParcelInput): ImportParcelInput {
  return {
    ...parcel,
    cadastralReference: normalizeReference(parcel.cadastralReference),
    name: parcel.name.trim(),
    oliveVariety: parcel.oliveVariety?.trim() || null,
    notes: parcel.notes?.trim() || null,
  };
}

function simplePolygon(geometry: CatastroParcel['geometry']): GeoJsonPolygon | null {
  if (geometry.type !== 'Polygon') return null;
  const coordinates = geometry.coordinates as number[][][];
  if (coordinates.length !== 1 || !coordinates[0] || coordinates[0].length < 4) return null;
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

export async function prepareCatastroBatch(
  holdingId: string,
  rawInputs: ImportParcelInput[],
  onUpstreamError?: (error: unknown, cadastralReference: string) => void,
): Promise<PreparedCatastroBatch> {
  const inputs = rawInputs.map(normalizeInput);
  const counts = new Map<string, number>();
  for (const input of inputs) {
    counts.set(input.cadastralReference, (counts.get(input.cadastralReference) ?? 0) + 1);
  }

  const references = [...new Set(inputs.map((input) => input.cadastralReference))];
  const existing = await getPool().query<{ cadastral_reference: string }>(
    `select cadastral_reference
     from plots
     where holding_id = $1
       and active = true
       and cadastral_reference = any($2::text[])`,
    [holdingId, references],
  );
  const existingReferences = new Set(existing.rows.map((row) => row.cadastral_reference));
  const preparedByReference = new Map<string, PreparedParcel>();
  const validationByReference = new Map<string, ValidationItem>();

  for (const input of inputs) {
    const reference = input.cadastralReference;
    if (validationByReference.has(reference)) continue;

    if (!input.name) {
      validationByReference.set(reference, {
        cadastralReference: reference,
        status: 'invalid',
        message: 'El nombre de la parcela es obligatorio.',
      });
      continue;
    }
    if (input.oliveVariety && input.oliveVariety.length > 80) {
      validationByReference.set(reference, {
        cadastralReference: reference,
        status: 'invalid',
        message: 'La variedad debe tener 80 caracteres como máximo.',
      });
      continue;
    }
    if (!validateCadastralReference(reference)) {
      validationByReference.set(reference, {
        cadastralReference: reference,
        status: 'invalid',
        message: 'Referencia catastral no válida.',
      });
      continue;
    }
    if ((counts.get(reference) ?? 0) > 1) {
      validationByReference.set(reference, {
        cadastralReference: reference,
        status: 'duplicate',
        message: 'La misma referencia aparece más de una vez en este lote.',
      });
      continue;
    }
    if (existingReferences.has(reference)) {
      validationByReference.set(reference, {
        cadastralReference: reference,
        status: 'duplicate',
        message: 'Esta referencia ya está añadida a la explotación.',
      });
      continue;
    }

    let official: CatastroParcel;
    try {
      official = await fetchCatastroParcelByReference(reference);
    } catch (error) {
      onUpstreamError?.(error, reference);
      validationByReference.set(reference, {
        cadastralReference: reference,
        status: 'upstream-error',
        message: 'Catastro no ha podido verificar esta referencia.',
      });
      continue;
    }

    const boundary = simplePolygon(official.geometry);
    if (!boundary) {
      validationByReference.set(reference, {
        cadastralReference: reference,
        status: 'unsupported',
        message: 'La geometría oficial es compleja y todavía no se puede importar automáticamente.',
      });
      continue;
    }

    const boundaryValidation = validateBoundary(boundary);
    if (!boundaryValidation.ok) {
      validationByReference.set(reference, {
        cadastralReference: reference,
        status: 'unsupported',
        message: 'La geometría oficial no supera la validación de Mágina Olivo.',
      });
      continue;
    }

    const center = polygonCenter(boundary);
    if (!center) {
      validationByReference.set(reference, {
        cadastralReference: reference,
        status: 'unsupported',
        message: 'No se ha podido obtener una ubicación válida para la parcela.',
      });
      continue;
    }

    preparedByReference.set(reference, {
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

  return {
    inputs,
    references,
    prepared: inputs.flatMap((input) => {
      const item = preparedByReference.get(input.cadastralReference);
      return item ? [item] : [];
    }),
    validationItems,
  };
}

export async function insertPreparedCatastroPlots(
  client: PoolClient,
  holdingId: string,
  farmId: string,
  prepared: PreparedParcel[],
): Promise<CreatedCatastroPlot[]> {
  const createdItems: CreatedCatastroPlot[] = [];

  for (const item of prepared) {
    const checkedAt = new Date();
    const inserted = await client.query<{
      id: string;
      name: string;
      cadastral_reference: string;
      boundary_area_ha: string;
      latitude: number;
      longitude: number;
      olive_tree_count: number | null;
      irrigation_type: IrrigationType | null;
      olive_variety: string | null;
      boundary_source_checked_at: Date;
    }>(
      `insert into plots (
         id, holding_id, farm_id, name,
         latitude, longitude, irrigation_type, olive_tree_count, olive_variety, notes,
         boundary_geojson, boundary_area_ha, boundary_source,
         boundary_updated_at, boundary_external_id, boundary_source_checked_at,
         cadastral_reference
       ) values (
         $1, $2, $3, $4,
         $5, $6, $7, $8, $9, $10,
         $11::jsonb, $12, 'catastro',
         $13, $14, $13,
         $14
       )
       returning id, name, cadastral_reference, boundary_area_ha, latitude, longitude,
                 olive_tree_count, irrigation_type, olive_variety, boundary_source_checked_at`,
      [
        randomUUID(),
        holdingId,
        farmId,
        item.input.name,
        item.latitude,
        item.longitude,
        item.input.irrigationType ?? null,
        item.input.oliveTreeCount ?? null,
        item.input.oliveVariety ?? null,
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
      oliveVariety: row.olive_variety,
      boundarySourceCheckedAt: row.boundary_source_checked_at,
    });
  }

  return createdItems;
}

export function duplicateRaceValidation(
  inputs: ImportParcelInput[],
  racedReferences: Set<string>,
): ValidationItem[] {
  return inputs.map((input) => racedReferences.has(input.cadastralReference)
    ? {
        cadastralReference: input.cadastralReference,
        status: 'duplicate',
        message: 'La referencia se añadió mientras se procesaba este lote.',
      }
    : { cadastralReference: input.cadastralReference, status: 'ready' });
}
