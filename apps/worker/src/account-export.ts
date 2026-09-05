import { createHash } from 'node:crypto';
import type { Pool } from 'pg';

type AccountExportRequest = {
  requester_snapshot: Record<string, unknown>;
  schema_version: number;
  status: 'requested' | 'generating' | 'ready' | 'expired' | 'failed';
};

type HoldingRow = {
  id: string;
  name: string;
  municipality: string | null;
  province: string | null;
  active: boolean;
  version: string;
  created_at: Date;
  updated_at: Date;
};

function iso(value: Date | string | null): string | null {
  if (value === null) return null;
  return value instanceof Date ? value.toISOString() : value;
}

function numberOrNull(value: string | number | null): number | null {
  if (value === null) return null;
  return Number(value);
}

export async function expireAccountExports(pool: Pool): Promise<number> {
  const result = await pool.query(
    `
      update account_exports
      set status = 'expired',
          artifact_text = null,
          updated_at = now()
      where status = 'ready'
        and expires_at <= now()
    `,
  );
  return result.rowCount ?? 0;
}

export async function generateAccountExport(
  pool: Pool,
  exportId: string,
  userId: string,
  ttlHours: number,
): Promise<void> {
  const current = await pool.query<AccountExportRequest>(
    `
      select requester_snapshot, schema_version, status
      from account_exports
      where id = $1 and user_id = $2
      limit 1
    `,
    [exportId, userId],
  );
  const request = current.rows[0];
  if (!request) throw new Error('Account export request not found');
  if (request.status === 'ready') return;
  if (request.status === 'expired') throw new Error('Account export request already expired');

  const started = await pool.query<AccountExportRequest>(
    `
      update account_exports
      set status = 'generating',
          started_at = coalesce(started_at, now()),
          error_message = null,
          updated_at = now()
      where id = $1
        and user_id = $2
        and status in ('requested', 'generating', 'failed')
      returning requester_snapshot, schema_version, status
    `,
    [exportId, userId],
  );
  const exportRequest = started.rows[0];
  if (!exportRequest) throw new Error('Account export request cannot be generated');

  try {
    const holdingsResult = await pool.query<HoldingRow>(
      `
        select
          h.id, h.name, h.municipality, h.province, h.active, h.version,
          h.created_at, h.updated_at
        from holdings h
        join holding_members hm on hm.holding_id = h.id
        where hm.user_id = $1
          and hm.role = 'owner'
          and hm.status = 'active'
        order by h.created_at asc, h.id asc
      `,
      [userId],
    );
    const holdingIds = holdingsResult.rows.map((row) => row.id);

    const [preferences, farms, plots, campaigns, deliveries, results, activities, documents, documentLinks] = await Promise.all([
      pool.query(
        `
          select
            preferred_cooperative_id, notify_weather, notify_tasks, notify_pending_yield,
            weather_rain_mm_threshold, weather_rain_probability_percent_threshold,
            weather_frost_c_threshold, weather_wind_kmh_threshold,
            created_at, updated_at
          from user_preferences
          where user_id = $1
          limit 1
        `,
        [userId],
      ),
      pool.query(
        `
          select id, holding_id, name, description, area_ha, latitude, longitude,
                 active, version, created_at, updated_at
          from farms
          where holding_id = any($1::uuid[])
          order by created_at asc, id asc
        `,
        [holdingIds],
      ),
      pool.query(
        `
          select id, holding_id, farm_id, name, area_ha, sigpac_reference, latitude, longitude,
                 irrigation_type, olive_tree_count, notes, active, version, created_at, updated_at
          from plots
          where holding_id = any($1::uuid[])
          order by created_at asc, id asc
        `,
        [holdingIds],
      ),
      pool.query(
        `
          select id, holding_id, name, season_start_year, season_end_year, start_date, end_date,
                 status, notes, version, created_at, updated_at
          from campaigns
          where holding_id = any($1::uuid[])
          order by season_start_year asc, id asc
        `,
        [holdingIds],
      ),
      pool.query(
        `
          select
            d.id, d.holding_id, d.campaign_id, d.farm_id, d.plot_id, d.cooperative_id,
            coop.official_name as cooperative_name, d.custom_destination, d.delivered_at,
            d.kilograms, d.variety, d.ticket_number, d.source_kind, d.external_source,
            d.external_id, d.verification_status, d.notes, d.version, d.created_at, d.updated_at
          from deliveries d
          left join cooperatives coop on coop.id = d.cooperative_id
          where d.holding_id = any($1::uuid[])
          order by d.delivered_at asc, d.id asc
        `,
        [holdingIds],
      ),
      pool.query(
        `
          select
            id, holding_id, delivery_id, result_type, value, unit, measured_at,
            source_kind, external_source, external_id, status, notes, created_at, updated_at
          from delivery_results
          where holding_id = any($1::uuid[])
          order by created_at asc, id asc
        `,
        [holdingIds],
      ),
      pool.query(
        `
          select
            id, holding_id, campaign_id, farm_id, plot_id, activity_type, occurred_at,
            affected_area_ha, product_name, product_registration_number, quantity, quantity_unit,
            cost_eur, notes, source_kind, verification_status, version, created_at, updated_at
          from activities
          where holding_id = any($1::uuid[])
          order by occurred_at asc, id asc
        `,
        [holdingIds],
      ),
      pool.query(
        `
          select
            id, holding_id, original_filename, mime_type, size_bytes, sha256,
            document_type, created_at
          from documents
          where holding_id = any($1::uuid[])
          order by created_at asc, id asc
        `,
        [holdingIds],
      ),
      pool.query(
        `
          select document_id, holding_id, entity_type, entity_id, created_at
          from document_links
          where holding_id = any($1::uuid[])
          order by created_at asc, document_id asc, entity_type asc, entity_id asc
        `,
        [holdingIds],
      ),
    ]);

    const preferenceRow = preferences.rows[0] as Record<string, unknown> | undefined;
    const payload = {
      schemaVersion: exportRequest.schema_version,
      product: 'Mágina Olivo',
      exportedAt: new Date().toISOString(),
      scope: {
        kind: 'owned_holdings',
        note: 'Incluye explotaciones donde la cuenta es owner activo. No incluye datos de otros miembros ni claves físicas de documentos.',
      },
      account: exportRequest.requester_snapshot,
      preferences: preferenceRow
        ? {
            preferredCooperativeId: preferenceRow.preferred_cooperative_id ?? null,
            notifyWeather: preferenceRow.notify_weather,
            notifyTasks: preferenceRow.notify_tasks,
            notifyPendingYield: preferenceRow.notify_pending_yield,
            weatherRainProbabilityPercentThreshold: numberOrNull(
              preferenceRow.weather_rain_probability_percent_threshold as string | number | null,
            ),
            weatherRainMmThreshold: numberOrNull(preferenceRow.weather_rain_mm_threshold as string | number | null),
            weatherFrostCThreshold: numberOrNull(preferenceRow.weather_frost_c_threshold as string | number | null),
            weatherWindKmhThreshold: numberOrNull(preferenceRow.weather_wind_kmh_threshold as string | number | null),
            createdAt: iso(preferenceRow.created_at as Date | string | null),
            updatedAt: iso(preferenceRow.updated_at as Date | string | null),
          }
        : null,
      holdings: holdingsResult.rows.map((row) => ({
        id: row.id,
        name: row.name,
        municipality: row.municipality,
        province: row.province,
        active: row.active,
        version: Number(row.version),
        createdAt: row.created_at.toISOString(),
        updatedAt: row.updated_at.toISOString(),
      })),
      farms: farms.rows.map((row: Record<string, unknown>) => ({
        id: row.id,
        holdingId: row.holding_id,
        name: row.name,
        description: row.description,
        areaHa: numberOrNull(row.area_ha as string | number | null),
        latitude: row.latitude,
        longitude: row.longitude,
        active: row.active,
        version: Number(row.version),
        createdAt: iso(row.created_at as Date | string | null),
        updatedAt: iso(row.updated_at as Date | string | null),
      })),
      plots: plots.rows.map((row: Record<string, unknown>) => ({
        id: row.id,
        holdingId: row.holding_id,
        farmId: row.farm_id,
        name: row.name,
        areaHa: numberOrNull(row.area_ha as string | number | null),
        sigpacReference: row.sigpac_reference,
        latitude: row.latitude,
        longitude: row.longitude,
        irrigationType: row.irrigation_type,
        oliveTreeCount: row.olive_tree_count,
        notes: row.notes,
        active: row.active,
        version: Number(row.version),
        createdAt: iso(row.created_at as Date | string | null),
        updatedAt: iso(row.updated_at as Date | string | null),
      })),
      campaigns: campaigns.rows.map((row: Record<string, unknown>) => ({
        id: row.id,
        holdingId: row.holding_id,
        name: row.name,
        seasonStartYear: row.season_start_year,
        seasonEndYear: row.season_end_year,
        startDate: row.start_date,
        endDate: row.end_date,
        status: row.status,
        notes: row.notes,
        version: Number(row.version),
        createdAt: iso(row.created_at as Date | string | null),
        updatedAt: iso(row.updated_at as Date | string | null),
      })),
      deliveries: deliveries.rows.map((row: Record<string, unknown>) => ({
        id: row.id,
        holdingId: row.holding_id,
        campaignId: row.campaign_id,
        farmId: row.farm_id,
        plotId: row.plot_id,
        cooperativeId: row.cooperative_id,
        cooperativeName: row.cooperative_name,
        customDestination: row.custom_destination,
        deliveredAt: iso(row.delivered_at as Date | string | null),
        kilograms: numberOrNull(row.kilograms as string | number | null),
        variety: row.variety,
        ticketNumber: row.ticket_number,
        sourceKind: row.source_kind,
        externalSource: row.external_source,
        externalId: row.external_id,
        verificationStatus: row.verification_status,
        notes: row.notes,
        version: Number(row.version),
        createdAt: iso(row.created_at as Date | string | null),
        updatedAt: iso(row.updated_at as Date | string | null),
      })),
      deliveryResults: results.rows.map((row: Record<string, unknown>) => ({
        id: row.id,
        holdingId: row.holding_id,
        deliveryId: row.delivery_id,
        resultType: row.result_type,
        value: numberOrNull(row.value as string | number | null),
        unit: row.unit,
        measuredAt: iso(row.measured_at as Date | string | null),
        sourceKind: row.source_kind,
        externalSource: row.external_source,
        externalId: row.external_id,
        status: row.status,
        notes: row.notes,
        createdAt: iso(row.created_at as Date | string | null),
        updatedAt: iso(row.updated_at as Date | string | null),
      })),
      activities: activities.rows.map((row: Record<string, unknown>) => ({
        id: row.id,
        holdingId: row.holding_id,
        campaignId: row.campaign_id,
        farmId: row.farm_id,
        plotId: row.plot_id,
        activityType: row.activity_type,
        occurredAt: iso(row.occurred_at as Date | string | null),
        affectedAreaHa: numberOrNull(row.affected_area_ha as string | number | null),
        productName: row.product_name,
        productRegistrationNumber: row.product_registration_number,
        quantity: numberOrNull(row.quantity as string | number | null),
        quantityUnit: row.quantity_unit,
        costEur: numberOrNull(row.cost_eur as string | number | null),
        notes: row.notes,
        sourceKind: row.source_kind,
        verificationStatus: row.verification_status,
        version: Number(row.version),
        createdAt: iso(row.created_at as Date | string | null),
        updatedAt: iso(row.updated_at as Date | string | null),
      })),
      documents: documents.rows.map((row: Record<string, unknown>) => ({
        id: row.id,
        holdingId: row.holding_id,
        originalFilename: row.original_filename,
        mimeType: row.mime_type,
        sizeBytes: Number(row.size_bytes),
        sha256: row.sha256,
        documentType: row.document_type,
        createdAt: iso(row.created_at as Date | string | null),
      })),
      documentLinks: documentLinks.rows.map((row: Record<string, unknown>) => ({
        documentId: row.document_id,
        holdingId: row.holding_id,
        entityType: row.entity_type,
        entityId: row.entity_id,
        createdAt: iso(row.created_at as Date | string | null),
      })),
    };

    const artifact = `${JSON.stringify(payload, null, 2)}\n`;
    const sizeBytes = Buffer.byteLength(artifact, 'utf8');
    const sha256 = createHash('sha256').update(artifact, 'utf8').digest('hex');

    await pool.query(
      `
        update account_exports
        set status = 'generating',
            artifact_text = $3,
            size_bytes = $4,
            sha256 = $5,
            error_message = null,
            completed_at = null,
            expires_at = now() + ($6 * interval '1 hour'),
            updated_at = now()
        where id = $1 and user_id = $2
      `,
      [exportId, userId, artifact, sizeBytes, sha256, ttlHours],
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await pool.query(
      `
        update account_exports
        set status = 'failed',
            error_message = $3,
            artifact_text = null,
            size_bytes = null,
            sha256 = null,
            completed_at = null,
            expires_at = null,
            updated_at = now()
        where id = $1 and user_id = $2 and status <> 'ready'
      `,
      [exportId, userId, message.slice(0, 4000)],
    );
    throw error;
  }
}
