# G0 — Especificación Técnica: Cuentas, Fincas Compartidas, Sincronización y Contratos

**Documento de referencia:** G0-AUTH-SYNC-AND-CONTRACTS-SPECIFICATION  
**Repositorio:** `izc05/magina-olivo-v20`  
**Autor:** Antigravity (Arquitectura Backend & Contratos)  
**Issues vinculadas:** [#727](https://github.com/izc05/magina-olivo-v20/issues/727), [#726](https://github.com/izc05/magina-olivo-v20/issues/726), [#735](https://github.com/izc05/magina-olivo-v20/issues/735), [#737](https://github.com/izc05/magina-olivo-v20/issues/737), [#739](https://github.com/izc05/magina-olivo-v20/issues/739), [#738](https://github.com/izc05/magina-olivo-v20/pull/738)  
**Fecha:** 11 de octubre de 2026  
**Estado:** G0 COMPLETADO — Aprobado en Principio (Pendiente de Implementación Productiva)

---

## 1. Auditoría del Estado Actual

### 1.1. Android (Cliente Local)
- **Base de datos Room:** Versión 25 en `main` (versión 26 aditiva en [PR #721](https://github.com/izc05/magina-olivo-v20/pull/721)).
- **Estructura de metadatos:** Todas las entidades del dominio agrícola (`FarmEntity`, `ParcelEntity`, `CampaignEntity`, `DeliveryEntity`, `HarvestEntity`, `ExpenseEntity`, `DocumentEntity`) incorporan `@Embedded val metadata: LocalMetadata`:
  - `createdAt`, `updatedAt`, `deletedAt` (soporte nativo de *soft delete* y *tombstones*).
  - `version: Long` (contador monótono local).
  - `syncStatus: SyncStatus` (`LOCAL_ONLY`, `PENDING`, `SYNCING`, `SYNCED`, `FAILED`, `CONFLICT`).
  - `remoteVersion: Long?`, `lastSyncedAt: Instant?`.
- **Cola de sincronización existente:** `SyncOutboxEntity` y `SyncOutboxDao` operan como outbox local en Room con operaciones `CREATE`, `UPDATE`, `DELETE`, `UPLOAD_ATTACHMENT`.
- **Identificadores:** Claves primarias UUID (`java.util.UUID`) autogeneradas localmente offline, permitiendo sincronización e inserción idempotente sin colisiones de identificadores numéricos.

### 1.2. Supabase Real (`zzelvbcuxsboafibfxch`)
- **Base de datos remota:** Solo dispone de tablas prototipo de Gate D (`public.farms`, `public.plots`) con 0 filas y RLS básico, sin esquema para campañas, pesadas, miembros, invitaciones ni contratos.
- **Storage:** Solo existe el bucket público `weather-radar`. Faltan los buckets privados con RLS para adjuntos agrícolas y contratos.
- **Edge Functions:** Operativas exclusivamente para clima (`weather-forecast`, `weather-radar`), mercado del aceite (`oil-market`) y proxy Catastro.
- **Veredicto:** El backend requiere las migraciones canónicas diseñadas en este Gate 0 antes de iniciar el flujo de autenticación y sincronización.

---

## 2. Arquitectura de Identidad, Workspaces y Roles por Finca

```mermaid
erDiagram
    AUTH_USERS ||--o| USER_PROFILES : "1:1 perfil"
    AUTH_USERS ||--o{ WORKSPACES : "posee (owner)"
    WORKSPACES ||--o{ FARMS : "contiene"
    FARMS ||--o{ FARM_ACCESS_GRANTS : "autoriza"
    AUTH_USERS ||--o{ FARM_ACCESS_GRANTS : "recibe permisos"
    FARMS ||--o{ FARM_INVITATIONS : "emite"
    FARMS ||--o{ DELIVERIES : "registra pesadas"
    FARMS ||--o{ FARM_CONTRACTS : "vincula"
    FARM_CONTRACTS ||--o{ FARM_CONTRACT_ATTACHMENTS : "contiene PDFs"
    FARMS ||--o{ CAMPAIGN_HARVEST_SHARE_AGREEMENTS : "acuerda 70/30"
```

### 2.1. Separación de Identidad Legal vs. Rol Operativo
- La creación de una cuenta en Mágina Olivo **no confiere titularidad jurídica civil ni acreditación REAFA** sobre los terrenos registrados.
- El usuario creador de la finca es su `creator_user_id` en el sistema.
- Si un explotador crea una finca que pertenece civilmente a un tercero, el explotador invita al propietario. Cuando el propietario acepta, se le otorga el grant de `OWNER`.

### 2.2. Roles y Capacidades (`farm_access_grants`)
En lugar de un campo booleano rígido, los permisos se gestionan mediante un array de capacidades granulares:

| Capacidad (`capability`) | Descripción | Propietario (`OWNER`) | Explotador (`EXPLOITER`) | Trabajador (`WORKER`) |
|---|---|:---:|:---:|:---:|
| `view_farm` | Ver nombre, municipio, linderos y parcelas | ✅ | ✅ | ✅ |
| `add_deliveries` | Registrar nuevas pesadas de aceituna | Delegable | ✅ | Opcional |
| `view_deliveries` | Ver pesadas y acumulados de campaña | ✅ | ✅ | ❌ |
| `manage_activities` | Registrar labores, tratamientos y jornales | ✅ | ✅ | ✅ (ámbito propio) |
| `propose_expenses` | Proponer partes de trabajo y gastos | ✅ | ✅ | ✅ |
| `manage_agreements` | Proponer y aceptar acuerdos de cuota (70/30) | ✅ | ✅ | ❌ |
| `view_contracts` | Ver acuerdos de arrendamiento y fechas | ✅ | ✅ | ❌ |
| `upload_contracts` | Subir PDF/fotos de contrato de ambas partes | ✅ | ✅ | ❌ |
| `manage_grants` | Invitar y revocar a otros miembros | ✅ | Delegable | ❌ |

---

## 3. Invitaciones Temporales por QR / Enlace ([#739](https://github.com/izc05/magina-olivo-v20/issues/739))

1. **Generación:**
   - La persona autorizada pulsa `Finca > Compartir finca` y selecciona el rol (`Propietario`, `Explotador`, `Trabajador`).
   - Se genera un token criptográfico opaco aleatorio (ej. 32 bytes en base64url).
   - En la base de datos se almacena únicamente el hash SHA-256 (`token_hash`), la fecha de caducidad (`expires_at`), `max_uses = 1` y las capacidades concedidas.
2. **TTL (Tiempo de vida):**
   - QR presencial: **15 minutos**.
   - Enlace WhatsApp / Correo: **7 días**.
3. **Reclamación y Activación:**
   - El destinatario escanea el QR o abre el App Link (`https://maginaolivo.es/invitacion?t=...`).
   - Si no está autenticado, la app le guía al registro/login y reanuda la invitación.
   - El servidor valida la vigencia, comprueba que `state = 'PENDING'` y crea atómicamente el registro en `farm_access_grants`.
   - Si la invitación no estaba vinculada a un email específico, el emisor recibe un aviso para confirmar la vinculación antes de abrir el acceso pleno.
4. **Protección contra ataques de repetición:**
   - Tras el primer uso exitoso, la invitación pasa a `CLAIMED` (`use_count = 1`). Cualquier escaneo posterior o reenvío es rechazado automáticamente.

---

## 4. Mapeo de Sincronización Room ↔ Supabase

Todos los identificadores son **UUID nativos**, garantizando inserciones deterministas e idempotentes sin reescribir claves primarias:

| Entidad Room Android | Tabla Postgres Supabase | Campos Críticos Mapeados | Política de Conflicto |
|---|---|---|---|
| `WorkspaceEntity` | `public.workspaces` | `id`, `owner_user_id`, `name`, `currency` | LWW por `updated_at` |
| `FarmEntity` | `public.farms` | `id`, `workspace_id`, `creator_user_id`, `name`, `status` | LWW por `version` |
| `ParcelEntity` | `public.parcels` | `id`, `cadastral_reference`, `geometry_geo_json`, `cadastral_area_m2` | LWW por `version` |
| `CampaignEntity` | `public.campaigns` | `id`, `farm_id`, `name`, `start_date`, `status` | LWW por `version` |
| `DeliveryEntity` | `public.deliveries` | `id`, `farm_id`, `campaign_id`, `net_grams`, `ticket_number`, `recorded_by_user_id` | **Inmutable** (inserción única, edición solo con versión incremental) |
| `HarvestEntity` | `public.harvests` | `id`, `farm_id`, `weight_grams`, `day_origin` | Inmutable |
| `ExpenseEntity` | `public.expenses` | `id`, `farm_id`, `amount_minor`, `concept`, `status`, `proposed_by_user_id` | Transición DRAFT → PROPOSED → POSTED |
| `DocumentEntity` | `public.documents` | `id`, `owner_type`, `owner_id`, `sha256`, `remote_path` | Inmutable por `sha256` |
| *Nuevo* | `public.farm_contracts` | `id`, `farm_id`, `owner_user_id`, `exploiter_user_id`, `start_date`, `end_date` | Aprobación bilateral |
| *Nuevo* | `public.campaign_harvest_share_agreements` | `id`, `farm_id`, `campaign_id`, `owner_percentage`, `exploiter_percentage` | Aprobación bilateral |

---

## 5. Acuerdos de Cosecha 70/30 ([#735](https://github.com/izc05/magina-olivo-v20/issues/735))

### Principio de Inmutabilidad de Pesadas
- Las pesadas individuales (`deliveries`) **NO se alteran, NO se descuentan y NO se duplican**.
- Si durante la campaña se registran 8 pesadas que suman **10.000 kg netos** (`net_grams = 10_000_000`):
  - El acuerdo 70/30 vigente en `campaign_harvest_share_agreements` calcula de forma determinista:
    $$\text{Cuota Propietario} = 10.000 \times 0,70 = 7.000\text{ kg}$$
    $$\text{Cuota Explotador} = 10.000 \times 0,30 = 3.000\text{ kg}$$
  - La suma de las cuotas es idéntica al total entregado: $7.000 + 3.000 = 10.000\text{ kg}$.
- Los gastos económicos (`expenses`) no se prorratean automáticamente según la cuota de aceituna, salvo pacto expreso recogido en el contrato.

---

## 6. Contratos de Arrendamiento y Almacenamiento Privado ([#737](https://github.com/izc05/magina-olivo-v20/issues/737))

### 6.1. Subida Bilateral de Documentos
- Propietario y explotador pueden subir de forma independiente su copia o escaneo del contrato a la misma ficha.
- Cada archivo genera un registro en `farm_contract_attachments` con:
  - `uploader_user_id` y `uploader_role` (`OWNER` o `EXPLOITER`).
  - `sha256`, tamaño y tipo MIME validado.
  - Estado: `PENDING_REVIEW` hasta que la otra parte confirme la lectura.
- La presencia del archivo **no constituye firma electrónica cualificada** ni garantiza legalidad civil; la aplicación refleja honestamente «Documento aportado por la otra parte (pendiente de tu revisión)».

### 6.2. Seguridad en Supabase Storage
- Buckets privados: `farm-attachments` y `farm-contracts` (`public = false`).
- Convención de rutas:
  - Fotos de pesadas: `farm-attachments/{farm_id}/{document_id}.jpg`
  - Contratos: `farm-contracts/{farm_id}/{contract_id}/{attachment_id}.pdf`
- Políticas RLS en `storage.objects`:
  - Solo los usuarios con `has_farm_capability(farm_id, 'view_contracts')` pueden descargar el archivo.
  - Solo los usuarios con `upload_contracts` pueden subir archivos al prefijo de esa finca.
  - Intrusos o trabajadores sin ese permiso específico reciben `403 Forbidden` al intentar resolver URLs firmadas o leer el objeto.

---

## 7. Pruebas Automatizadas y Validación

Se ha implementado y ejecutado con éxito la suite de pruebas automatizadas:
`supabase/tests/auth_sync_rls_simulation.test.ts` (ejecutable mediante `node --experimental-strip-types --test`).

**Resultados obtenidos (100% pasando):**
```text
✔ G0 Multi-Tenant: User A owns farm, User D (uninvited) cannot read or write (3.7ms)
✔ G0 Invitations: Single-use temporary QR, claim by User B, replay prevention (1.1ms)
✔ G0 Offline Delivery & Sync: User B records 1.200 kg offline, User A sees it once after sync (0.3ms)
✔ G0 Harvest Share Agreement: 70/30 split on 10.000 kg netos computes exactly without altering pesadas (0.1ms)
✔ G0 Storage RLS & Grant Revocation: Private contracts accessible only to authorized parties (0.6ms)
```

---

## 8. Gestión de Riesgos y Bloqueos Reales

1. **Bloqueo 1 — No modificar Supabase de producción en G0:**  
   Las migraciones DDL (`supabase/migrations/20261011120000_*.sql` a `20261011120002_*.sql`) quedan incorporadas en el repositorio para revisión técnica. **No deben ejecutarse en la base viva hasta la aprobación expresa del gate**.
2. **Bloqueo 2 — Coexistencia con PR #721 (Room v26):**  
   Esta rama se basa directamente en `v20/main` y no toca ninguna tabla territorial de Bedmar-Jódar. La futura migración Room v27 añadirá los campos de enlace a Supabase Auth sin entrar en conflicto con la migración 25→26.
3. **Bloqueo 3 — Revocación de acceso y copias offline locales:**  
   La revocación de un grant impide de inmediato nuevas lecturas o escrituras remotas hacia Supabase. No obstante, una copia que ya fue descargada localmente a un dispositivo Android antes de la revocación física requiere que la app invalide la base de datos local en su próximo *handshake* con red.
