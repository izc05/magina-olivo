# Modelo de datos V1 — Mágina Olivo

> Documento de diseño. No equivale todavía al esquema definitivo de base de datos.

## Principios

1. Los datos privados pertenecen a la explotación/usuario, no a la cooperativa ni al proveedor que los originó.
2. El registro manual, una foto, un CSV y una futura API oficial deben terminar en el mismo modelo canónico.
3. Todo dato importado relevante conserva procedencia, fecha y estado de verificación.
4. Los agregados se pueden cachear, pero siempre deben poder reconstruirse desde registros base.
5. No guardar credenciales de portales de socio para automatizar navegación.
6. La V1 debe funcionar sin integraciones externas.

## Entidades principales

### users

- id
- email
- name
- locale
- timezone
- created_at
- updated_at

### holdings / explotaciones

- id
- owner_user_id
- name
- description
- municipality
- province
- active
- created_at
- updated_at

Diseñar desde el inicio pensando en que una explotación pueda tener varios miembros en una fase posterior.

### holding_members — preparado para extensión

No es imprescindible exponerlo en la primera UI, pero conviene que el modelo no bloquee colaboración futura.

- id
- holding_id
- user_id
- role: owner / admin / collaborator / viewer
- status
- created_at
- updated_at

### farms / fincas

- id
- holding_id
- name
- description
- area_ha
- latitude
- longitude
- active
- created_at
- updated_at

### plots / parcelas

- id
- farm_id
- name
- area_ha
- sigpac_reference
- sigpac_province_code opcional
- sigpac_municipality_code opcional
- sigpac_aggregate opcional
- sigpac_zone opcional
- sigpac_polygon opcional
- sigpac_plot opcional
- sigpac_enclosure opcional
- latitude
- longitude
- geometry opcional
- irrigation_type
- olive_tree_count
- notes
- active
- created_at
- updated_at

La referencia SIGPAC legible puede coexistir con campos estructurados para permitir búsquedas/importaciones futuras sin parsear texto.

### plot_varieties

Relación entre parcela y variedad.

- id
- plot_id
- variety_name
- percentage_or_count opcional

### campaigns

- id
- holding_id
- name
- season_start_year
- season_end_year
- start_date
- end_date
- status: planned / active / closed / archived
- notes
- created_at
- updated_at

## Directorio público de cooperativas/almazaras

### cooperatives

Información de directorio, separada de los datos privados del usuario.

- id
- official_name
- municipality
- province
- address
- phone
- email opcional
- website_url
- entity_type opcional
- dop_sierra_magina_status opcional
- public_description
- source_url
- source_checked_at
- verification_status
- created_at
- updated_at

### cooperative_access_points

Metadatos públicos sobre accesos oficiales detectados. No contiene credenciales de usuarios.

- id
- cooperative_id
- access_type: website / member_portal / mobile_app / other
- provider_name opcional
- public_url
- label
- verification_status
- source_url
- checked_at
- active

Ejemplos: web oficial, acceso de socios Almazaras.com, app pública de proveedor.

## Campaña, entregas y rendimientos

### deliveries / entregas

Registro canónico de una entrega de aceituna.

- id
- campaign_id
- plot_id opcional
- farm_id opcional
- cooperative_id opcional
- custom_destination opcional
- delivered_at
- kilograms
- variety opcional
- harvest_origin opcional: suelo / vuelo / mixto / otro
- ticket_number opcional
- notes
- source_type: manual / document_import / file_import / provider_sync
- source_provider opcional
- external_id opcional
- import_batch_id opcional
- verification_status: verified / user_confirmed / pending_review / rejected
- dedup_key opcional
- created_by
- created_at
- updated_at
- archived_at opcional

Una entrega puede vincularse a una parcela concreta o, cuando el agricultor no pueda separar una carga mixta, solo a finca/campaña.

No se fuerza `plot_id`.

### delivery_results / resultados de entrega

El rendimiento se separa de `deliveries` porque normalmente llega después, puede venir de otra fuente y conviene conservar su propia trazabilidad.

- id
- delivery_id
- result_type: yield_percentage / industrial_yield / moisture / acidity / other
- value
- unit
- measured_at opcional
- source_type: manual / document_import / file_import / provider_sync
- source_provider opcional
- external_id opcional
- import_batch_id opcional
- verification_status
- notes opcional
- created_by
- created_at
- updated_at

En V1, la pantalla principal puede utilizar `yield_percentage`, pero el modelo no queda bloqueado a un único resultado analítico.

### Cálculo de rendimiento de campaña

La métrica principal será, cuando los datos representen porcentajes comparables, la **media ponderada por kilos**:

```text
sum(delivery.kilograms * yield_percentage) / sum(delivery.kilograms)
```

Solo se incluyen entregas válidas que tengan resultado compatible y no estén archivadas/rechazadas.

La UI puede mostrar además media simple, máximo y mínimo como métricas secundarias, claramente etiquetadas.

## Labores y tareas

### activities / labores

- id
- campaign_id opcional
- plot_id opcional
- farm_id opcional
- activity_type
- performed_at
- description
- product_or_material opcional
- quantity opcional
- unit opcional
- cost_amount opcional
- notes
- source_type: manual / import / future_ai_draft
- verification_status
- created_by
- created_at
- updated_at

Una labor puede aplicarse a parcela o finca completa. Si una futura IA interpreta una frase, debe crear un borrador/revisión, no una escritura silenciosa crítica.

### tasks

- id
- holding_id
- plot_id opcional
- farm_id opcional
- title
- description
- due_at
- status
- priority
- created_by
- created_at
- updated_at

## Documentos

### documents

El archivo físico/objeto debe permanecer en almacenamiento privado.

- id
- holding_id
- storage_key
- original_filename
- mime_type
- size_bytes
- document_type
- content_hash opcional
- source_type: upload / camera / import / provider_sync
- uploaded_by
- created_at
- deleted_at opcional

### document_links

Permite relacionar un documento con una entrega, resultado, labor, finca, parcela o campaña sin duplicar el archivo.

- id
- document_id
- entity_type
- entity_id
- created_at

## Importaciones e interoperabilidad

### import_batches

Representa cada importación iniciada por el usuario o por una integración autorizada.

- id
- holding_id
- cooperative_id opcional
- source_type: document / csv / xlsx / provider
- provider_name opcional
- source_document_id opcional
- original_filename opcional
- status: uploaded / parsed / needs_review / confirmed / failed / cancelled
- rows_detected
- rows_imported
- rows_rejected
- duplicate_count
- initiated_by
- created_at
- confirmed_at opcional
- error_code opcional

### import_rows

Zona de staging/auditoría antes de crear o actualizar registros canónicos.

- id
- import_batch_id
- row_number
- raw_payload limitado
- normalized_payload
- target_entity_type
- target_entity_id opcional
- status: parsed / warning / duplicate / accepted / rejected
- warning_codes opcional
- dedup_key opcional
- created_at

La importación debe mostrar vista previa y requerir confirmación cuando haya ambigüedad.

### external_connections — futuro

Solo para integraciones oficiales/autorizadas.

- id
- holding_id
- cooperative_id opcional
- provider_name
- connection_type
- external_account_reference opcional
- credential_reference opcional
- scopes opcional
- status
- last_sync_at opcional
- created_at
- updated_at

`credential_reference` debe apuntar a un almacén seguro de secretos/tokens. Nunca guardar contraseñas en claro ni diseñar esta entidad para simular logins web humanos.

### sync_runs — futuro

- id
- external_connection_id
- started_at
- finished_at
- status
- records_created
- records_updated
- records_skipped
- duplicate_count
- error_code opcional
- cursor_reference opcional

## Avisos y automatización

### notifications

- id
- user_id
- type
- priority
- title
- body
- read_at
- related_entity_type opcional
- related_entity_id opcional
- source_url opcional
- created_at

### automation_rules

- id
- holding_id
- owner_user_id
- type
- enabled
- configuration
- created_at
- updated_at

### automation_runs

- id
- rule_id
- started_at
- finished_at
- status
- retry_count
- error_code opcional
- metadata limitada

## Fuentes públicas

Para AEMET, RAIF, SIGPAC y avisos públicos de cooperativas, no mezclar el dato descargado con los datos privados del usuario sin conservar fuente y fecha.

Las tablas concretas de caché pública se decidirán al implementar cada adapter, con al menos:

- provider/source
- external/source id cuando exista
- fetched_at
- valid_at / published_at cuando proceda
- payload normalizado
- source_url

No conservar indefinidamente datos de proveedores cuando su licencia/condiciones no lo permitan.

## Duplicados e idempotencia

La misma entrega puede llegar por:

1. registro manual;
2. foto de ticket;
3. CSV descargado después;
4. futura sincronización oficial.

No se deben crear cuatro entregas distintas.

La deduplicación combinará, cuando estén disponibles:

- cooperative_id;
- campaign_id;
- external_id;
- ticket_number;
- delivered_at;
- kilograms;
- hash de documento/origen.

Una coincidencia fuerte puede marcarse como duplicado automático; una coincidencia dudosa debe pedir confirmación.

Nunca sobrescribir silenciosamente un dato confirmado por el usuario con una importación menos fiable.

## Jerarquía de confianza orientativa

No es una verdad absoluta, pero sirve para resolver conflictos:

1. integración oficial autenticada con identificador estable;
2. documento original emitido por cooperativa/almazara y confirmado;
3. fichero estructurado exportado por el propio usuario;
4. entrada manual confirmada por usuario;
5. extracción automática pendiente de confirmar.

Los conflictos relevantes deben quedar visibles y auditables.

## Datos derivados

Evitar usar campos agregados como única fuente de verdad.

Ejemplos:

- kilos totales = suma de entregas válidas;
- rendimiento ponderado = cálculo sobre entregas + resultados;
- gasto total = suma de costes incluidos según criterio documentado.

Se podrán mantener agregados/cache para rendimiento, pero siempre deben poder reconstruirse.

## Borrado y archivo

Los registros de campaña importantes deberían admitir archivado lógico para mantener trazabilidad.

Las operaciones de borrado definitivo de documentos o datos personales se tratarán por separado y respetarán las obligaciones de privacidad aplicables.

## Multiusuario y aislamiento

Toda consulta privada debe resolverse a través de `holding_id` y comprobar membresía/permisos en backend.

Un usuario nunca podrá acceder a datos privados de otra explotación por conocer un ID.

## Decisiones V1 ya cerradas

- La entrega puede existir sin parcela concreta.
- El rendimiento puede llegar después y se modela separadamente.
- La media principal será ponderada por kilos cuando sea semánticamente compatible.
- Toda importación conserva procedencia.
- Existe staging antes de confirmar importaciones complejas.
- Se prepara neutralidad de proveedor.
- No se almacenan credenciales de portales privados para scraping/login automatizado.
- IA/OCR, si se añade, produce borradores verificables y no cambia la fuente de verdad.
