# G0 — cierre de las tres reproducciones de #752

Base Android integrada: `b35f5c22d83e407a93f29b01b5ca2eb8dcce036b` (#753).
Se conserva la historia de #743 y se incorpora main sin conflictos. Este bloque no
despliega migraciones ni activa sincronización Android.

## Evidencia local

Antes de corregir: el reproductor de #752 confirma buckets agrícolas públicos,
lectura de contrato por política Storage heredada `USING(true)` y ausencia de
parcelas para un delegado con `view_farm`. Las cuatro regresiones nuevas fallan
antes de rellenar la migración y pasan después. `npm test --prefix supabase`:
53/53 (48 PostgreSQL/PGlite con Auth/Storage de fixture y 5 simulaciones TypeScript).
No equivalen a pruebas HTTP contra Supabase ni datos reales de agricultores.

La nueva migración forward `20261016041222`:

- Convierte en privados únicamente `farm-attachments` y `farm-contracts`;
  preserva objetos, metadata y buckets ajenos.
- Rechaza políticas desconocidas en Storage y las quince tablas G0. No elimina
  automáticamente políticas de otros servicios. El inventario se compara por
  tabla y nombre; presupone que las políticas G0 conocidas son las creadas por
  estas migraciones, no una certificación de un proyecto arbitrario manipulado.
- Añade SELECT delegado por vínculo vigente y capacidad `view_farm`. No otorga
  escritura de parcelas ni acceso al resto del workspace. Caducidad, vigencia,
  borrado del vínculo y revocación se prueban explícitamente.

Ejecutar siempre el lote en transacción. Si aparece una política desconocida,
detenerse, inventariar su definición y revisar el cambio específico antes de
volver a migrar. No ignorar el error ni borrar todas las políticas. Ninguna
ejecución persistente DEV/STAGING/producción está autorizada por este bloque.

## Pruebas remotas necesarias

El workflow G0 usa Supabase nativo efímero y cuatro identidades Auth JWT, sin
correos, contra HTTP Auth/PostgREST/Storage, tanto limpio como legacy. Añade:
bucket realmente público antes y privado después, archivo conservado, descarga
anónima denegada, rechazo de política heredada y lectura delegada solo de la
parcela autorizada, sin escritura y sin acceso tras revocación. Las claves de
servicio solo pertenecen al fixture backend efímero; nunca a Android/artifacts.

Docker local no está disponible; las nuevas pruebas nativas quedan pendientes
de Actions hasta que el run del SHA publicado termine. Registrar SHA y enlaces
del run en #743/#744; no reutilizar los resultados verdes del HEAD anterior.

## Límites y siguientes gates

Compatibilidad #753: main mantiene su capa Auth; G0 usa `auth.uid()` del JWT
Supabase y prueba identidades nativas. No se vinculan UUID locales ni se envía
ningún agregado agrícola. No se han leído/modificado bases reales del usuario;
la conservación probada aquí utiliza fixtures sintéticos.

## Segundo commit: integridad de agregados y reinvitación

Las regresiones también reprodujeron alteración del autor histórico de pesadas,
gasto referido a pesada de otra finca, documento atribuido a agregado de otro
workspace, entrega con harvest inexistente y aceptación de invitación sobre grant
vencido sin acceso efectivo. Una revisión independiente identificó además el
cruce de cosecha/pesada entre campañas de la misma finca: regresión roja antes,
verde después; comprobación también añadida al caso HTTP nativo. La campaña
nula legacy de una cosecha sigue permitida sin atribuirle una campaña inventada.
La migración forward `20261016041601` impide esos
casos. Los casos válidos mantienen UUID/importes; no se recalculan pesos o dinero.

Otra revisión focalizada confirmó atribución unilateral al crear una finca:
`creator_user_id` o `owner_id` ajeno concedían a esa identidad visibilidad y
capacidades sin invitación. No permitía leer sus fincas preexistentes. Dos
regresiones SQL y un caso nativo HTTP (workspace propio/NULL) lo cubren. El alta
ordinaria exige creador propio y propietario propio o vacío. Se conserva el
propietario vacío sin atribuirlo automáticamente. Transferir/atribuir otra
identidad necesita un futuro flujo validado de consentimiento; no se reescriben
fincas legacy existentes ni se certifica su titularidad por esta restricción.

Una reinvitación con grant vencido/futuro debe fallar y revertir la aceptación;
no extiende permisos indefinidamente ni elimina una caducidad fijada por el
propietario. El emisor deberá revisar la vigencia antes de aceptar de nuevo.
Los documentos se validan contra DELIVERY/FARM/PARCEL/CONTRACT existentes en su
workspace. ACTIVITY no tiene tabla G0: se rechaza explícitamente hasta definir
su contrato; la base local Android no se modifica. Referencias preexistentes
inválidas detienen la migración para revisión, sin borrarlas ni reasignarlas.

Se amplía también la suite nativa HTTP con esos rechazos, rollback de invitación
y ejemplos positivos. Registrar los nuevos controles del SHA definitivo; los
verdes del primer commit no validan este segundo cambio. El primer bloque sí
superó G0 nativo limpio/legacy en Actions run `38849619107` (SHA `23e1ec53`).
No se habilita compartir fincas en Android ni se declara paridad de sincronización.
DTO de agregados no soportados, revocación offline y permisos detallados de
encargado/jornalero/transportista siguen siendo gates de G1/G2.

Fuentes: [buckets públicos y privados](https://supabase.com/docs/guides/storage/buckets/fundamentals)
y [políticas Storage](https://supabase.com/docs/guides/storage/security/access-control).
PR sin fusión; sin producción, SMTP, APK ni cambios Web V3.
