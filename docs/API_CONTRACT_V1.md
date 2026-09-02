# Contrato API V1 — Mágina Olivo

Estado: diseño previo al spike técnico.

## Principios

- Base path: `/api/v1`.
- JSON para datos estructurados.
- Autenticación por sesión server-side; el frontend no guarda tokens de larga duración en `localStorage`.
- Toda autorización se comprueba en backend.
- Recursos privados siempre se filtran por `holding_id`/membresía.
- Escrituras sensibles aceptan `Idempotency-Key`.
- Actualizaciones concurrentes usan versión/revisión para evitar sobrescrituras silenciosas.
- Errores con estructura estable y `request_id`.
- Fechas en ISO 8601 con zona/UTC normalizada.
- Dinero en unidades enteras menores o decimal exacto; nunca `float` binario como fuente de verdad.
- Kilos y porcentajes usan `numeric/decimal` en persistencia.

## Respuesta de error

```json
{
  "error": {
    "code": "DELIVERY_CONFLICT",
    "message": "La entrega cambió desde que se abrió.",
    "request_id": "...",
    "details": {}
  }
}
```

No devolver stack traces, SQL, secretos ni contenido privado innecesario.

## Identidad y sesión

- `GET /api/v1/me`
- `GET /api/v1/me/holdings`
- endpoints de auth bajo el handler del proveedor seleccionado, montados en ruta propia y con cookies seguras.

`GET /me` devuelve únicamente datos necesarios para la UI y permisos efectivos.

## Explotaciones

- `GET /holdings`
- `POST /holdings`
- `GET /holdings/:holdingId`
- `PATCH /holdings/:holdingId`

En V1 el usuario normal opera sobre una explotación seleccionada; el contrato no debe asumir que solo existirá una para siempre.

## Fincas

- `GET /holdings/:holdingId/farms`
- `POST /holdings/:holdingId/farms`
- `GET /farms/:farmId`
- `PATCH /farms/:farmId`
- `POST /farms/:farmId/archive`

## Parcelas

- `GET /farms/:farmId/plots`
- `POST /farms/:farmId/plots`
- `GET /plots/:plotId`
- `PATCH /plots/:plotId`
- `POST /plots/:plotId/archive`
- `GET /plots/:plotId/timeline`

La referencia SIGPAC se almacena como dato trazable; una futura geometría se modelará sin convertir un texto concatenado en clave primaria.

## Campañas

- `GET /holdings/:holdingId/campaigns`
- `POST /holdings/:holdingId/campaigns`
- `GET /campaigns/:campaignId`
- `PATCH /campaigns/:campaignId`
- `POST /campaigns/:campaignId/close`
- `GET /campaigns/:campaignId/summary`

`summary` puede devolver agregados calculados/cached, pero las entregas y resultados siguen siendo fuente reconstruible de verdad.

## Entregas

- `GET /campaigns/:campaignId/deliveries`
- `POST /campaigns/:campaignId/deliveries`
- `GET /deliveries/:deliveryId`
- `PATCH /deliveries/:deliveryId`
- `POST /deliveries/:deliveryId/archive`

### Crear entrega

Cabecera obligatoria para clientes con posibilidad de reintento:

`Idempotency-Key: <uuid>`

Payload mínimo:

```json
{
  "delivered_at": "2026-11-18T18:42:00+01:00",
  "kilograms": "1842.000",
  "destination_id": "..."
}
```

Opcionales:
- `farm_id`
- `plot_id`
- `ticket_number`
- `variety`
- `notes`
- `client_generated_id`

La API debe devolver la misma creación ante un reintento legítimo con la misma clave y payload equivalente.

## Resultados / rendimientos

- `GET /deliveries/:deliveryId/results`
- `POST /deliveries/:deliveryId/results`
- `PATCH /results/:resultId`
- `POST /results/:resultId/supersede`

El rendimiento se modela separado de la entrega.

Campos candidatos:
- `result_type`
- `value`
- `unit`
- `measured_at`
- `source_type`
- `source_reference`
- `verification_status`

Para el piloto, `result_type=yield_percentage` será el caso principal.

No borrar silenciosamente un rendimiento corregido: conservar procedencia y sustitución cuando exista valor histórico relevante.

## Labores

- `GET /plots/:plotId/activities`
- `POST /plots/:plotId/activities`
- `GET /activities/:activityId`
- `PATCH /activities/:activityId`
- `POST /activities/:activityId/archive`

Las variantes específicas (tratamiento, abonado, riego...) pueden vivir como `details` validados por esquema o tablas especializadas si el spike demuestra que mejora integridad/consultas. No introducir JSON arbitrario sin validación.

## Tareas

- `GET /holdings/:holdingId/tasks`
- `POST /holdings/:holdingId/tasks`
- `PATCH /tasks/:taskId`
- `POST /tasks/:taskId/complete`

## Cooperativas / almazaras

Directorio público/verificado separado de los datos privados del usuario:

- `GET /cooperatives`
- `GET /cooperatives/:cooperativeId`

Vista privada relacionada con el agricultor:

- `GET /holdings/:holdingId/cooperatives/:cooperativeId/summary`

El endpoint privado puede resumir las propias entregas del usuario a ese destino; nunca expone información de otros agricultores.

## Documentos

Flujo recomendado con subida privada directa/presignada:

1. `POST /documents/upload-intents`
2. backend valida tamaño/tipo/permiso y crea intención.
3. cliente sube a object storage mediante URL limitada.
4. `POST /documents/:documentId/complete`
5. backend verifica objeto y marca disponible.

Endpoints:
- `GET /documents/:documentId`
- `POST /documents/:documentId/links`
- `DELETE /documents/:documentId/links/:linkId`
- `DELETE /documents/:documentId` sujeto a política de retención/permisos.

La URL de descarga será temporal; nunca bucket público.

## Importaciones

- `POST /imports`
- `POST /imports/:importId/upload`
- `POST /imports/:importId/parse`
- `GET /imports/:importId/preview`
- `POST /imports/:importId/commit`
- `POST /imports/:importId/cancel`

Estados candidatos:
`created -> uploaded -> parsing -> review_required -> committed | failed | cancelled`

La fase `commit` es transaccional y vuelve a ejecutar validaciones/deduplicación.

## Avisos

- `GET /notifications`
- `POST /notifications/:notificationId/read`
- `POST /notifications/read-all`

## Datos externos

- `GET /weather/current?holding_id=...`
- `GET /weather/forecast?holding_id=...`
- `GET /raif/olive?holding_id=...`

El frontend consume nuestro contrato normalizado, no formatos AEMET/RAIF directamente.

## Estado de sincronización offline

Para una escritura aceptada se devuelve:

```json
{
  "data": {"id": "..."},
  "meta": {
    "request_id": "...",
    "version": 1,
    "idempotency_key": "..."
  }
}
```

El cliente elimina el elemento de outbox únicamente tras una respuesta confirmada o recuperación inequívoca de la operación idempotente.

## Concurrencia

Recursos editables incorporarán `version` entero o ETag equivalente.

Una actualización basada en versión antigua devuelve `409 CONFLICT` con los datos mínimos necesarios para resolverlo.

Nunca aplicar last-write-wins silencioso a entregas, rendimientos o datos de parcela importantes.

## Paginación

Preferencia: cursor estable para listados que puedan crecer.

Ejemplo:
- `?limit=50&cursor=...`

Evitar `offset` como única estrategia en históricos largos.

## Auditoría

Las operaciones sensibles deben poder atribuirse a:
- usuario;
- holding;
- acción;
- recurso;
- fecha;
- request id;
- origen (`web`, `offline_sync`, `import`, `provider_sync`, `admin`).

No registrar el contenido completo de documentos ni notas privadas en logs operativos.

## OpenAPI

Antes del MVP completo, la API V1 debe publicar un contrato OpenAPI generado/validado desde los mismos esquemas de runtime cuando sea posible.

El frontend no debe depender de respuestas no documentadas.
