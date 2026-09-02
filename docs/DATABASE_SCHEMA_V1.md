# Esquema de base de datos V1 — Mágina Olivo

Estado: diseño previo al spike. PostgreSQL será la fuente de verdad.

## Convenciones

- PostgreSQL 18.x soportado.
- Identificadores internos UUID; evaluar UUIDv7 durante el spike por orden temporal natural.
- `timestamptz` para eventos reales.
- `numeric` para kilos, porcentajes y cantidades exactas relevantes.
- `created_at` / `updated_at` en entidades mutables.
- `archived_at` cuando sea preferible archivo lógico.
- FK reales siempre que no impidan importaciones en staging.
- Índices definidos desde consultas reales, no por intuición indiscriminada.

## Identidad

Las tablas propias del proveedor de autenticación se mantienen separadas conceptualmente del dominio.

### user_profiles

- `user_id` PK/FK auth user
- `display_name`
- `locale`
- `timezone`
- timestamps

No poner permisos globales de explotación en el perfil de usuario.

## Explotaciones y miembros

### holdings

- `id`
- `name`
- `municipality`
- `province`
- `description`
- timestamps
- `archived_at`

### holding_members

- `holding_id`
- `user_id`
- `role` (`owner`, `admin`, `collaborator`, `viewer`)
- `status`
- `joined_at`

Unique `(holding_id, user_id)`.

Toda consulta privada importante deriva autorización de esta relación.

## Fincas y parcelas

### farms

- `id`
- `holding_id`
- `name`
- `description`
- `area_ha numeric(12,4)` opcional
- `latitude numeric(9,6)` opcional
- `longitude numeric(9,6)` opcional
- timestamps
- `archived_at`

Índice por `(holding_id, archived_at)`.

### plots

- `id`
- `farm_id`
- `name`
- `area_ha numeric(12,4)`
- `sigpac_reference` opcional
- `irrigation_type`
- `olive_tree_count` opcional
- `latitude` / `longitude` opcionales
- `notes`
- timestamps
- `archived_at`

### plot_varieties

- `id`
- `plot_id`
- `variety_name`
- `percentage numeric(6,3)` opcional
- `tree_count` opcional

No asumir que una parcela solo tiene Picual.

## Campañas

### campaigns

- `id`
- `holding_id`
- `name`
- `season_start_year`
- `season_end_year`
- `start_date`
- `end_date` opcional
- `status` (`draft`, `active`, `closed`, `archived`)
- `notes`
- timestamps

Evitar una restricción global que impida campañas solapadas hasta validar casos reales; sí garantizar que el nombre/años no se dupliquen accidentalmente dentro del mismo holding.

## Directorio de destinos

### cooperatives

Tabla pública/administrada, no perteneciente a un holding.

- `id`
- `official_name`
- `legal_type` opcional
- `municipality`
- `province`
- `address`
- `phone`
- `email`
- `website_url`
- `member_portal_url` opcional
- `digital_maturity` opcional
- `source_url`
- `source_checked_at`
- `verification_status`
- timestamps

### holding_destinations

Permite que un usuario configure nombres/alias o destinos no incluidos aún en directorio.

- `id`
- `holding_id`
- `cooperative_id` nullable
- `custom_name` nullable
- `alias` nullable
- `active`
- timestamps

Check: debe existir `cooperative_id` o `custom_name`.

## Entregas

### deliveries

- `id`
- `holding_id`
- `campaign_id`
- `destination_id`
- `farm_id` nullable
- `plot_id` nullable
- `delivered_at timestamptz`
- `kilograms numeric(14,3)`
- `variety` nullable
- `ticket_number` nullable
- `notes` nullable
- `source_type` (`manual`, `offline_sync`, `document`, `file_import`, `provider_sync`)
- `source_reference` nullable
- `client_generated_id` nullable
- `verification_status`
- `version integer default 1`
- `created_by`
- timestamps
- `archived_at`

Checks:
- kilos > 0;
- parcela, si existe, debe pertenecer a finca/holding coherente;
- campaña debe pertenecer al holding.

Índices candidatos:
- `(holding_id, campaign_id, delivered_at desc)`
- `(destination_id, delivered_at desc)` dentro de scope privado
- ticket/reference cuando tenga utilidad real.

Unique parcial/candidato para `client_generated_id` por holding/origen para idempotencia de cliente.

## Resultados

### delivery_results

- `id`
- `holding_id`
- `delivery_id`
- `result_type`
- `value numeric(14,6)`
- `unit`
- `measured_at` nullable
- `source_type`
- `source_reference` nullable
- `verification_status`
- `supersedes_result_id` nullable
- `version`
- `created_by`
- timestamps
- `archived_at`

Para rendimiento porcentual, check razonable `value >= 0 and value <= 100`; no reutilizar ese check para otros result types.

La vista principal de campaña usa media ponderada por kilos sobre resultados activos/comparables.

## Labores

### activities

- `id`
- `holding_id`
- `campaign_id` nullable
- `plot_id`
- `activity_type`
- `performed_at timestamptz`
- `description` nullable
- `product_or_material` nullable
- `quantity numeric(14,4)` nullable
- `unit` nullable
- `cost_amount numeric(14,2)` nullable
- `currency char(3)` default `EUR`
- `notes` nullable
- `details jsonb` nullable
- `version`
- `created_by`
- timestamps
- `archived_at`

`details` solo se permite si la API lo valida contra un esquema por `activity_type`.

No almacenar datos regulatorios críticos en JSON sin contrato.

## Tareas

### tasks

- `id`
- `holding_id`
- `plot_id` nullable
- `title`
- `description` nullable
- `due_at` nullable
- `priority`
- `status`
- `completed_at` nullable
- `created_by`
- timestamps
- `archived_at`

## Documentos

### documents

- `id`
- `holding_id`
- `storage_key`
- `original_filename`
- `mime_type`
- `size_bytes bigint`
- `sha256` nullable
- `document_type`
- `status` (`pending_upload`, `available`, `quarantined`, `deleted`)
- `uploaded_by`
- timestamps
- `deleted_at` nullable

`storage_key` nunca se construye desde nombre de usuario ni filename sin sanitización.

### document_links

- `id`
- `holding_id`
- `document_id`
- `entity_type`
- `entity_id`
- timestamps

En el spike se decidirá si esta relación polimórfica se mantiene o se reemplaza por tablas FK específicas. Si se mantiene, la API debe validar pertenencia y tipo exhaustivamente.

## Importaciones

### import_batches

- `id`
- `holding_id`
- `source_type`
- `source_name`
- `status`
- `document_id` nullable
- `parser_version` nullable
- `created_by`
- timestamps
- `committed_at` nullable

### import_rows_staging

- `id`
- `batch_id`
- `row_number`
- `raw_data jsonb`
- `normalized_data jsonb`
- `validation_status`
- `duplicate_candidate_id` nullable
- `error_codes jsonb` nullable
- timestamps

Staging no es fuente de verdad agrícola.

Tras commit, los registros canónicos conservan enlace al batch/origen.

## Idempotencia API

### idempotency_keys

- `scope_user_id`
- `key`
- `route_fingerprint`
- `request_hash`
- `response_status`
- `response_body` o referencia segura
- `resource_type`
- `resource_id`
- `created_at`
- `expires_at`

Unique `(scope_user_id, key)`.

Una misma key con payload distinto debe fallar, no reutilizar el resultado anterior.

## Automatización

### automation_rules

- `id`
- `holding_id`
- `rule_type`
- `enabled`
- `configuration jsonb`
- timestamps

### automation_runs

- `id`
- `rule_id`
- `scheduled_for`
- `started_at`
- `finished_at`
- `status`
- `attempt`
- `error_code` nullable
- `metadata jsonb` mínima

### job_outbox

- `id`
- `job_type`
- `payload jsonb`
- `available_at`
- `locked_at` nullable
- `attempts`
- `status`
- timestamps

Se empieza con PostgreSQL; no introducir Redis/cola externa hasta medir necesidad.

## Notificaciones

### notifications

- `id`
- `user_id`
- `holding_id`
- `type`
- `title`
- `body`
- `related_entity_type` nullable
- `related_entity_id` nullable
- `dedupe_key` nullable
- `read_at` nullable
- `created_at`

## Auditoría

### audit_events

- `id`
- `occurred_at`
- `request_id`
- `actor_user_id` nullable
- `holding_id` nullable
- `action`
- `resource_type`
- `resource_id` nullable
- `source`
- `metadata jsonb` mínima

No almacenar contraseñas, tokens, texto completo de documentos ni notas privadas salvo justificación explícita.

## Integridad multi-tenant

Regla de aplicación: toda entidad privada lleva `holding_id` directa o derivable de forma inequívoca.

Durante el spike evaluar dos capas:

1. autorización obligatoria en servicio/API;
2. Row Level Security de PostgreSQL como defensa adicional si puede implementarse sin introducir complejidad operativa excesiva.

No depender únicamente de filtros del frontend.

## Migraciones

- migrations versionadas en Git;
- forward migrations pequeñas;
- migración probada desde base limpia;
- migración probada sobre snapshot representativo;
- backup antes de cambios destructivos;
- downgrade solo cuando sea seguro; de lo contrario restauración/forward fix documentado.

## Datos derivados

No guardar agregados como única verdad.

Ejemplos reconstruibles:
- kilos campaña = SUM(deliveries.kilograms activos);
- rendimiento ponderado = SUM(kilos * rendimiento) / SUM(kilos con rendimiento comparable);
- entregas pendientes = deliveries sin resultado activo de tipo rendimiento.

Se pueden mantener vistas materializadas/cache más adelante si las métricas justifican la complejidad.
