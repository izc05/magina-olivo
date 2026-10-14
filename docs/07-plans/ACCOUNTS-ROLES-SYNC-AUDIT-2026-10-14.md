# Cuentas, roles y sincronización — auditoría de integración

Fecha: 2026-10-14. Encargo del propietario: auditar y preparar la implementación; solicitar autorización antes de la primera PR funcional de cuentas. No se autoriza integrar #743, desplegar producción ni activar sincronización real.

## Revisiones y límites de la evidencia

- Android integrado: `b5e3357da46147cd38ba008461c6713a76a05199` (#750). Room v25. #751, `6b2aa007cc8722139f79df08f21533f53dd3e712`, añade solicitud contextual tras guardar; sigue en borrador y requiere completar los casos pendientes y todos los controles sobre el SHA final.
- Backend #743: `ffeec476a7af1345b58f31c6a7dbaddc5bb57678`. Se revisan las tres migraciones G0, funciones, grants, RLS, Storage, contratos y las tres suites. No se altera su rama.
- Territorio #721 y Room v26 siguen fuera de main: cualquier futura migración de cuentas debe partir de la versión finalmente integrada, preservar UUID/datos y superar sus pruebas de migración. No reutilizar un número de versión ni abrir una base v26 con código v25.
- Reejecución local de #743: `npm test --prefix supabase`, 40/40: 35 PostgreSQL/PGlite con plataforma Auth/Storage simulada y 5 simulaciones TypeScript. Las simulaciones no son sincronización Android real.
- GitHub histórico del SHA exacto de #743: G0 Security DEV runs [38301854214](https://github.com/izc05/magina-olivo-v20/actions/runs/38301854214) y [38301849477](https://github.com/izc05/magina-olivo-v20/actions/runs/38301849477), PostgreSQL y Supabase nativo limpio/legacy. Los 12 casos HTTP/JWT nativos son evidencia de aquel entorno efímero, no de una integración Android ni de un STAGING persistente.
- Reproducción adicional local desechable: [script](../06-testing/evidence/accounts-roles-audit/reproduce-g0-gaps.mjs) y [resultado](../06-testing/evidence/accounts-roles-audit/reproduction.txt). Confirma tres defectos; sus assertions confirman el defecto, NO certifican seguridad. Ejecutar con `node <script> <checkout-743>`; requiere las dependencias ya instaladas de #743. No conecta a servidores.
- No se ha inspeccionado ni modificado producción. No se dispone de inventario/certificación de un proyecto persistente DEV/STAGING para esta auditoría. Antes de una integración real hacen falta URL/proyecto de pruebas separado, configuración Auth/deep links y usuarios sintéticos; ninguna service-role key debe entrar en Android.

## Dictamen

#743 contiene una base real de autorización, invitaciones y consentimiento, pero no permite certificar integración segura ni paridad agrícola. Sus controles verdes cubren escenarios seleccionados. Tres brechas adicionales están reproducidas localmente; otras requieren regresiones. Android sigue siendo local y no tiene motor de sincronización o sesión Supabase integrado. No fusionar #743 para habilitar cuentas tal como está.

## Riesgos y condiciones de cierre

| Prioridad | Hallazgo y localización en #743 | Evidencia / corrección requerida |
|---|---|---|
| P1 | `...120002_g0_contracts_and_storage_rls.sql:515`: `ON CONFLICT DO NOTHING` conserva buckets existentes públicos | Reproducidos ambos buckets públicos tras migrar. Fallar o hacer privada la configuración conforme a una migración revisada; validar descarga HTTP anónima y JWT en limpio y legacy. Un bucket público permite descarga pública sin protección equivalente a las políticas privadas. |
| P1 | Misma migración, políticas Storage desde línea 553: sobreviven políticas permisivas con otros nombres | Reproducido un intruso autenticado leyendo un contrato por `legacy_public_read USING(true)`. Inventario de políticas y migración que falle ante autorizaciones inesperadas; repetir para todas las tablas protegidas. El guard existente de `farms` no cubre Storage ni el resto. |
| P1 | `...120001_g0_agricultural_sync_schema.sql:41`: parcelas solo para propietario de workspace | Reproducido delegado `view_farm`: finca=1, vínculo=1, parcela=0. Definir lectura por finca/vínculo vigente sin revelar otras parcelas del workspace; probar límites positivos/negativos, revocación y vigencias. |
| P1 | `...120000_g0_auth_workspaces_shared_farms.sql:399,456`: upsert de aceptación conserva `valid_from/valid_until` del grant anterior | Inspección estática: reinvitar a un grant caducado/futuro puede devolver aceptación sin acceso. Definir renovación explícita y añadir pruebas claim/confirm de grants vencidos y futuros. No declarar reproducido aún. |
| P2 | `...120001...:196`: entrega no congela `recorded_by_user_id` | El autor histórico puede alterarse mientras finca/campaña están protegidas. Test de otro manager y política/trigger de inmutabilidad de autor. |
| P2 | `...120001...:285`: propuesta de gasto permite referencia a entrega de otra finca del mismo workspace | Validar coherencia finca/campaña/entrega, no solo workspace. `deliveries.harvest_id` carece de FK y `documents.owner_id` no valida el agregado polimórfico: añadir casos de inexistencia y cruce de propietario/finca. |
| P1 integración | Paridad Room incompleta y protocolos de sincronización ausentes | No enviar solo las tablas existentes: se perderían relaciones, jornales, tarifas, análisis y snapshots. Primero cerrar DTO/agregados, CAS, idempotencia y conservación de archivos. |

Fuentes oficiales: [RLS y políticas](https://supabase.com/docs/guides/database/postgres/row-level-security), [Storage access control](https://supabase.com/docs/guides/storage/security/access-control). RLS y privilegios SQL son capas distintas; los permisos amplios del fixture PGlite no demuestran los grants de PostgREST. Validar ambas capas en Supabase nativo. Las políticas permisivas se combinan y no quedan neutralizadas por añadir otra más restrictiva.

## Implementado frente a pendiente

Implementado en G0: perfiles asociados a Auth, workspaces con propietario, fincas y grants de capacidades, invitaciones temporales con token hash y protección frente a replay, vinculación a email, confirmación del emisor cuando no están vinculadas a un destinatario, funciones privilegiadas con controles explícitos, contratos y reparto de cosecha con aceptación bilateral por RPC, congelación desde la primera firma y protección contra reutilizar consentimientos tras alterar términos. Revocación y parte del aislamiento tienen pruebas PostgreSQL y HTTP/JWT. Conservar este trabajo.

No implementado en Android actual: registro/login/recuperación/sesión persistente Supabase, selección de cuenta, vinculación remota de UUID locales, processor de outbox, DTO completos, pull paginado/cursor, CAS por versión remota, conflictos, recuperación de envío interrumpido, subida duradera de archivos, almacenamiento local de grants y revocación offline, interfaces de invitación/contratos. Consentimiento en SQL no equivale a firma criptográfica/cualificada ni resuelve por sí mismo requisitos legales.

## Permisos por rol

La autorización efectiva del backend depende de capacidades, vigencia y estado del grant; el nombre del rol no debe otorgar privilegios implícitos en Android. Esta matriz distingue la situación actual de la decisión pendiente:

| Actor | Backend actual / pruebas | Regla de producto que falta cerrar |
|---|---|---|
| Propietario/creador | Acceso amplio a su finca; workspace owner. Actor A probado. | Gestión de miembros/contratos, separación entre propiedad legal y gestión, transferencia de cuenta/finca. |
| Arrendatario/explotador | Acceso mediante grant. Actor B prueba entregas, consentimiento y Storage privado. | Capacidades explícitas por finca, duración del arrendamiento y quién valida propuestas económicas. No hacerlo dueño del workspace al vincular. |
| Encargado/jornalero | Worker C prueba lectura de finca y denegación de contratos privados. `manage_activities` opera sobre cosechas; no existe cobertura completa de trabajos Android ni restricción a registros propios. | Separar encargado y jornalero, alcance de creación/corrección y acceso a dinero/documentos. `propose_expenses` inserta PROPOSED, pero no garantiza lectura de su propia propuesta. |
| Transportista | No hay conjunto operativo probado específico; solo combinación posible de capacidades. | Permitir exclusivamente las entregas/servicio asignados, sin acceso por defecto a jornales, costes o contratos. Hace falta decisión y escenarios propios. |
| Intruso/anónimo | Casos seleccionados denegados; el legacy Storage reproducido rompe esa garantía. | Matriz exhaustiva por operación, tabla, objeto y finca. |

Los valores de metadata controlados por el usuario y los botones ocultos no son autorización. Compartir finca nunca debe compartir todo el workspace. La revocación online debe cerrar DB/Storage/RPC; offline no puede borrar datos reales automáticamente ni prometer que revoca una copia ya descargada.

## Comparación Room / Supabase

Room v25 tiene 46 tablas. G0 añade 15 tablas públicas: 10 con nombre compartido, 5 remotas nuevas y 36 Room ausentes. Dos ausentes son infraestructura local (`sync_outbox`, `weather_cache`); las otras 34 necesitan sincronización de agregado o exclusión explícita, no omisión silenciosa.

| Compartidas | Diferencias importantes |
|---|---|
| workspaces | Propietario local UUID aleatorio (`LocalWorkspaceRepository`), remoto FK Auth. `WorkspaceDao` elige primer workspace activo sin sesión/cuenta. |
| farms | `cover_document_id` local frente a URI remota, creator/owner Auth; conservar identidad y archivo. |
| user_profiles | Local workspace/version/tombstone frente a identidad `auth.users.id`, teléfono/locale/timezone remotos. No copiar la fila sin mapeo. |
| parcels / farm_parcel_memberships | Geometría, identidad y vigencias; lectura compartida rota como se reprodujo. Preservar vínculos y orden de agregados. |
| campaigns | Estados de Android PREPARATION/ACTIVE/HARVEST/CLOSED; no interpretar comentarios SQL como un enum de estados distinto. |
| harvests | `farm_id` nullable local y NOT NULL remoto; legado necesita tratamiento explícito. Autor Auth; falta protocolo de actualización/tombstone delegado. Peso obligatorio en ambos, no cambiar cálculos. |
| deliveries | Autor Auth, falta FK harvest y protocolo CAS. Distribuciones y análisis de rendimiento están ausentes. |
| expenses | Falta `harvest_id` remoto; se rompe relación canónica con Jornal/costes de recogida. Padres activity/provider no están completos en G0. |
| documents | URI local no portable; falta protocolo binario/metadata/ack. Autor de subida Auth. Políticas Storage actuales de lectura/inserción no cubren upsert y borrado seguro. |

Remotas nuevas: farm_access_grants, farm_invitations, farm_contracts, farm_contract_attachments, campaign_harvest_share_agreements.

Room ausentes: campaign_parcels, harvest_parcels, delivery_parcels, delivery_yield_analyses; activities, activity_parcels, pruning_details, fertilization_details, phytosanitary_details, soil_work_details, irrigation_details, irrigation_price_snapshots, maintenance_details, incident_details, activity_planning_details; machines, activity_machines; workers, harvest_labour, labour_payments, harvest_equipment, recollection_rates, agricultural_organizations, organization_roles, purchases, purchase_items; agronomic_people, agronomic_credentials, phytosanitary_equipment_profiles, phytosanitary_equipment_inspections; document_ocr_extractions, reminders, alerts, profile_settings, sync_outbox, weather_cache.

Converters: UUID textual, Instant local epoch-ms frente a timestamptz, LocalDate civil ISO. Mantener gramos, minutos, metros cuadrados y porcentajes en sus unidades, dinero en unidades menores y su exponente de moneda, NULL distinto de cero. No recomputar tarifas, jornales, repartos ni rendimientos al importar.

La Web existente usa Google/cookie `magina_session` y modelos users/user_sessions/workspace_memberships. No es una sesión Supabase Android intercambiable. Web V3 continúa pausada; cualquier puente de identidad será una dependencia explícita y no una modificación visual.

## Vinculación de datos locales sin pérdidas

1. Inventario y copia verificable de base y archivos con UUID, relaciones, importes, versiones y tombstones. No vaciar Room, recrear tablas destructivamente ni sustituir owner local por Auth silenciosamente.
2. Usuario inicia sesión y confirma qué workspace/fincas propios desea vincular; no reclamar registros solo por nombre, Catastro o email. Una finca legacy con workspace NULL no debe asignarse sin consentimiento y operación autorizada.
3. Operación servidor de claim/bootstrap con idempotency key estable, identidad JWT, ownership comprobado y transacción. Mantener UUID locales; tabla de mapeo explícita para propietario/perfil cuando sus identidades difieren.
4. Registrar estado local de vinculación y checkpoints. Un timeout tras commit remoto debe poder repetirse sin duplicados; no marcar outbox enviado antes de verificar acuse.
5. Comparar manifiesto completo remoto/local y reabrir sin conexión. Conservar archivos locales hasta confirmación verificable de metadata y binario. Logout/cambio de cuenta no debe mostrar datos de otra cuenta ni destruir trabajo sin subir.
6. Conflicto de propiedad o dos dispositivos con datos independientes exige revisión del usuario. No deduplicar pesadas por fecha: varias entregas el mismo día son válidas.

## Sincronización y conflictos

El contrato `docs/01-architecture/OFFLINE-SYNC-CONTRACT-RC1.md` pide base_remote_version/CAS y cursor servidor; la especificación G0 propone LWW por updated_at/version. Resolver esa discrepancia antes de código productivo: relojes del teléfono no deben decidir dinero o consentimiento. La version de un acuerdo negociado no es la versión de concurrencia de un agregado.

`OutboxWriter` colapsa cambios y genera otra operación; todavía no incorpora el flujo remoto completo. Requiere claim/lease, retry con el mismo operation_id, base_remote_version, ack transaccional que no borre una edición posterior, recuperación PROCESSING, backoff y cursor duradero. Repositorios/Room deben seguir siendo la fuente local; red nunca requisito para guardar un trabajo. Agregados con hijos se envían/aplican atómicamente. Pull debe incluir tombstones y cambios de permisos; conflictos económicos quedan pendientes de resolución explícita.

## Orden de PR pequeñas y pruebas de aceptación

| Orden | PR y alcance | Gate antes de integrar |
|---|---|---|
| 0 | Cerrar #751/#462 y dependencia territorial #721. Correcciones G0 demostradas en PR separadas, conservando #743. | JVM/native/Actions mismo SHA; migración Room íntegra. P1 RLS/Storage corregidos y suites clean/legacy ampliadas. Autorización independiente de merge. |
| 1 | Registro/login/recuperación y sesión Android DEV, interfaz Cuenta real, estado offline claro. Sin claim, push/pull ni activación productiva. | Cuenta verificada, sesión/refresh/reinicio, logout y aislamiento local, errores de red, link de recuperación expirado/usado/ajeno y redirect allowlist. JVM y instrumentadas; integración Auth con usuarios sintéticos DEV/STAGING. Autorización del propietario para comenzar. |
| 2 | Claim/vinculación de workspace/fincas existentes, backup y manifiesto verificable. | Datos y UUID conservados, migraciones antiguas, rollback, timeout/retry, dos dispositivos, rechazo de finca ajena. No producción. |
| 3a | DTO/agregados y operación CAS/idempotente servidor; sin scheduler activo. | Roundtrip completo de tablas/archivos, importes/snapshots, tombstones; duplicado/reordenación/ack de edición antigua. |
| 3b | Pull/push DEV controlado, cursor, reintentos y resolución de conflictos. | Android A→DEV→Android B, modo avión/reconexión/reinicio, caída en cada checkpoint, conflictos simultáneos sin pérdida. Activación real necesita autorización explícita. |
| 4 | Compartir finca y roles locales/remotos. | Matriz por rol y operación, aislamiento de parcelas/documentos/gastos, grant suspendido/futuro/caducado/revocado, caché offline y cambio de cuenta. Decidir encargado/jornalero/transportista. |
| 5a | Invitaciones/QR con registro/login previo y confirmación. | Destinatario incorrecto, TTL, replay, emisor revocado, reinvitación caducada, concurrencia y reanudación del deep link sin conceder por UI. |
| 5b | Contratos y acuerdos con UI sobre RPC existentes. | Consentimiento bilateral, congelación/hash/versión, partes iguales rechazadas, archivos privados y no reutilizar firma al editar términos. Ninguna promesa de firma cualificada. |

No abrir la primera PR funcional hasta autorización. El cierre Android no permite emitir APK candidata: ese gate final sigue separado. No se modifican cálculos, Web V3 ni producción.
