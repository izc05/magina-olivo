# G1/G2 — vinculación consentida y sincronización privada

Diseño para revisión, 16/10/2026. No activa red agrícola, scheduler ni migraciones.
Base integrada: `b35f5c22d83e407a93f29b01b5ca2eb8dcce036b`, Auth Android #753.
Seguridad pendiente de integrar: #743; auditoría y contrato de cierre: #752.
Room integrado v25; #721 propone v26. El código futuro deberá usar la versión
efectivamente integrada y reservar una migración posterior, nunca reutilizar v26.

## Estado que debe conservarse

Cuenta ya registra, confirma correo, inicia/cierra sesión y recupera contraseña
en DEV. No reclama fincas ni activa sync. La identidad Auth no sustituye al
propietario UUID creado por `LocalWorkspaceRepository`. `WorkspaceDao` todavía
elige un workspace local sin resolver una cuenta remota. `OutboxWriter` y
`SyncOutboxDao` son infraestructura local, no un motor remoto terminado.

#743 contiene RLS, grants e invitaciones por finca y consentimientos contractuales.
Sus tablas no cubren todos los agregados Room; no basta copiar las diez tablas
con nombres coincidentes. Mantener `OFFLINE-SYNC-CONTRACT-RC1.md`: CAS e idempotencia,
sin LWW basado en el reloj del móvil para datos agrícolas, dinero o consentimientos.
Web V3 sigue pausada; preparar DTO/identidad no implica modificar su interfaz.

## G1 — vinculación voluntaria

1. Inventariar SQLite y archivos: UUID, relaciones, valores, versiones,
   tombstones, tamaño y hash de binarios. Copia privada verificable fuera del
   repositorio y estado reanudable. Fallar si falta espacio o no puede verificarse.
2. Tras login, ofrecer selección explícita de fincas locales y explicar alcance.
   No enviar nada antes del consentimiento. Cancelar debe dejar el inventario
   y todos los datos operativos iguales. Nombre, Catastro o email no prueban propiedad.
3. Separar datos exclusivamente locales de datos remotos ya pertenecientes a
   otra identidad. Para un espacio exclusivamente local el usuario confirma su
   legitimidad; el servidor no puede certificar propiedad jurídica de una finca.
   Ante UUID remoto existente, nunca sobrescribir: comprobar actor/workspace
   autorizado o devolver conflicto de titularidad sin revelar datos ajenos.
4. RPC transaccional de reserva/vinculación con JWT, `operation_id` estable,
   versión de payload y manifiesto hash. Unicidad de operación por actor y UUID
   de finca. Dos reclamaciones simultáneas: solo una puede reservar la identidad;
   la otra requiere revisión, no reasignación automática.
5. Mantener UUID de entidades agrícolas. Guardar mapa separado entre identidad
   local, Auth y workspace remoto; no sustituir owner/autor históricos en bloque.
   RLS debe impedir que un cliente elija el propietario remoto o workspace ajeno.
6. Guardar binding/acuse/checkpoint local en transacción. Timeout después del
   commit remoto: consultar/repetir la misma operación y obtener el mismo resultado.
   No activar push/pull por haber reservado una finca. G2 necesita gate propio.

Logout no borra SQLite, archivos ni outbox. Cambiar cuenta no reatribuye sus
registros: la interfaz debe ocultar espacios vinculados de otra identidad y
ofrecer recuperar la cuenta correcta, conservando las ediciones sin subir.
El acceso offline previamente autorizado requiere política explícita de bloqueo
local; no prometer revocación instantánea de copias descargadas sin conexión.

Aceptación G1: cancelar sin cambios; dos cuentas y dos dispositivos; finca ajena
rechazada; UUID remoto ocupado sin sobreescritura; migración desde versiones
soportadas; muerte de proceso en cada checkpoint; reintento sin duplicados;
manifiesto antes/después idéntico salvo metadata de vinculación documentada;
fotos/documentos no vacíos conservados. No tocar bases reales para ejecutar QA.

## G2 — protocolo antes del scheduler

**PR G2a, contrato y servidor aislado.** Definir DTO por agregado y exclusiones
explícitas: fincas/parcelas/vínculos, campañas/snapshots, trabajos/detalles,
jornales/personas/tarifas/equipos/pagos, pesadas/análisis/distribuciones,
gastos/compras, documentos/binarios. Datos locales de dispositivo, preferencias
privadas y cachés no deben publicarse accidentalmente. Registros legacy con
relación remota obligatoria ausente requieren resolución explícita y permanecen
locales. Ninguna conversión inventa finca, autor, kilos o importes.

**PR G2b, outbox sin activación automática.** Operación inmutable con actor,
binding, aggregate UUID, `operation_id`, `base_remote_version` y revisión local.
Lease recuperable tras PROCESSING interrumpido. Coalescer solo operaciones no
enviadas; un retry conserva ID/payload. El acuse de una revisión antigua nunca
elimina una edición local posterior. Backoff con jitter y errores saneados.

**PR G2c, CAS y pull DEV controlado.** Servidor verifica RLS y versión esperada,
escribe agregado/hijos y recibo idempotente en una transacción. Conflicto conserva
ambas versiones; no descarta silenciosamente importes o pesos. Cursor monotónico
servidor con desempate estable, paginación y tombstones; aplicarlo y avanzar
checkpoint en la misma transacción Room. Idempotencia de pull y operaciones
reordenadas. El reloj del teléfono no decide precedencia. Un acuerdo firmado
no se edita mediante el endpoint genérico de sincronización.

**PR G2d, archivos.** Fichero local permanece hasta acuse de binario y metadata
con hash/tamaño verificados. Ruta determinista por finca/documento/versión,
bucket privado, autorización por recurso; no URL pública persistente ni
credencial administrativa en Android. Metadata no prueba existencia del binario.
Carga parcial/reintento sin sobrescribir otra versión; limpieza de huérfanos y
retención requieren contrato y autorización antes de borrar cualquier contenido.

**Gate G2, antes de activar sync real.** Android A offline → DEV → Android B:
exactamente una pesada y sus adjuntos; reinicio/desconexión en cada fase; dos
ediciones simultáneas; cursor/acuse repetido; revocación durante upload; token
caducado; cambio de cuenta; conjunto completo de tablas/relaciones/importes y
binarios reconciliado. Web futura consume el mismo protocolo; sesión/cookie
histórica web no se considera intercambiable con JWT Android automáticamente.

## Compartición posterior: roles no equivalen a propiedad

| Actor | Alcance previsto para validar antes de habilitar |
| --- | --- |
| Propietario/gestor autorizado | Miembros y permisos por finca, sin atribuir propiedad jurídica por una casilla o por vinculación local. |
| Arrendatario | Capacidades y vigencia explícitas; no se convierte en dueño del workspace. Contratos requieren consentimiento separado. |
| Encargado | Operaciones autorizadas en fincas asignadas; acceso económico y gestión de personas deben acordarse explícitamente. |
| Jornalero | Solo tareas/partes asignados y datos mínimos; no hereda permisos de encargado ni acceso a dinero/contratos. |
| Transportista | Entregas/servicios asignados; no recibe lectura de toda la finca o workspace por defecto. |

El backend actual prueba OWNER/EXPLOITER/WORKER/VIEWER más capacidades; encargado,
jornalero y transportista todavía necesitan contrato de producto y pruebas
específicas. No inventar capacidades productivas durante G1/G2. Futuras
invitaciones necesitan destinatario/TTL/replay/confirmación y renovación revisada
de grants vencidos; QR no concede permiso por sí mismo. Contratos siguen las RPC
bilaterales existentes; no prometen firma cualificada ni validez jurídica.

## Riesgos y autorizaciones

- G0 pendiente de merge y despliegue DEV autorizado: no basar G1 en políticas
  todavía no integradas ni trasladarlas a producción.
- Paridad Room incompleta: gate de inventario/roundtrip por agregado, con
  propietarios/autores locales que no son Auth y posibles fincas sin workspace.
- Revocación offline: negar futuras operaciones al reconectar, aislar la cuenta
  en UI y conservar trabajo no enviado para resolución; no borrar copias del usuario.
- Web histórica y Android tienen identidades distintas: puente futuro auditado,
  sin deduplicar por email solamente.
- Activación de red agrícola, migraciones persistentes, seguridad y fusión
  requieren autorización independiente. No generar APK candidata.

Este documento es diseño revisable. No se declara implementado ninguno de los
RPC de vinculación, protocolos CAS, scheduler o interfaces de compartición.
