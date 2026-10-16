# G1a — conservación local previa a cuenta

16/10/2026. Rama `feat/g1-local-preservation`, código `ce4273c5cf3f8b62f6220a502de996f15782d3a2`.
PR https://github.com/izc05/magina-olivo-v20/pull/755 (borrador).

## Integración verificada

`origin/main` = `9575a1e5e86c3735f02d65744f00d75c2a06e2e7`.
PR #743/#754/#721/#752/#753: estado MERGED, commits comprobados vía GitHub.

- Android CI [38878252701](https://github.com/izc05/magina-olivo-v20/actions/runs/38878252701):
  foundation y gate3-emulator SUCCESS sobre ese SHA.
- G0 [38878327415](https://github.com/izc05/magina-olivo-v20/actions/runs/38878327415):
  postgres-contracts, native-auth-storage clean y legacy SUCCESS. Estos entornos
  son efímeros; no certifican ni modifican ningún proyecto persistente.
- Local: `testDevDebugUnitTest assembleDevDebugAndroidTest`, BUILD SUCCESSFUL,
  674 JVM / 0 fallos. No APK candidata; solo compilación DEV para QA.

## Implementación real

`LocalLinkBackup.capture(UUID)` copia lógicamente todas las tablas y sus valores,
esquema, índices y versión desde una transacción Room. Copia binarios locales
referenciados por documentos, exige bytes no vacíos, tamaño/hash compatibles
con metadata disponible, verifica SQLite y claves ajenas. El manifiesto se
contrasta con la base copiada y cada archivo. Directorio privado bajo
`noBackupFilesDir`, sin sesiones Auth, sin exportación ni red agrícola.

Solo se publica una copia completa. Un retry del mismo UUID verifica la copia
inmutable; no la sobrescribe aunque el usuario haya seguido editando. Esa copia
NO sustituye el inventario actual que deberá autorizarse antes de vincular.
No cambia UUID/owner/versión/outbox, no añade migración Room ni cambia UI.

## Pruebas y revisión

1. Rojo antes de implementación: compilador no encuentra `LocalLinkBackup`.
2. Primera ejecución nativa: 30 pruebas de migración/Auth storage PASSED y seis
   nuevas FAILED porque Android ya crea `android_metadata` en el destino.
   Se corrige exclusivamente la tabla interna del destino nuevo.
3. Repetición final: **38/38, 0 skipped, 0 failed**, BUILD SUCCESSFUL.
   Ocho pruebas nuevas: snapshot y bytes/kilos/jornales/importes, retry tras
   recrear servicio, archivo ausente, copia corrupta, manifiesto incompleto,
   identidad de operación alterada, concurrencia y tamaño incompatible.
   Otras 30: `RoomMigrationTest` y `AccountAuthStorageTest` (v26 y sesiones cifradas).
4. `AccountAuthScreenTest`: **3/3**. Login, offline, recreación y logout comparan
   huellas de todas las tablas/propietarios/outbox y bytes de foto; registro,
   recuperación, errores y proveedor no configurado muestran estados honestos.
   Auth simulado explícito, Room/archivo aislados; no usa cuentas de producción.
5. Dos revisiones independientes de solo lectura. Corregidos inventario de
   manifiesto, cancelación durante hashes/antes de publicar y carrera de creación
   del directorio. No quedan bloqueantes identificados en el slice G1a.
6. `git diff --check` y `bash -n .github/scripts/gate3-emulator-evidence.sh`: correctos.

Comando nativo:

```text
gradle --no-daemon connectedDevDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.isivoltpro.maginaolivo.data.local.LocalLinkBackupTest,com.isivoltpro.maginaolivo.data.local.RoomMigrationTest,com.isivoltpro.maginaolivo.AccountAuthStorageTest
adb shell am instrument -w -e class com.isivoltpro.maginaolivo.AccountAuthScreenTest com.isivoltpro.maginaolivo.dev.test/androidx.test.runner.AndroidJUnitRunner
```

Emulador API 35. Sin `pm clear` ni acceso a datos agrícolas persistentes reales.
La regla de UI usa Room desechable y restaura preferencias; las pruebas nuevas
solo crean/eliminan su propia base, fotos y UUID de copia.

## Pendientes y límites

- Lint local y CI de #755 estaban en curso al redactar; comprobar checks del
  HEAD final antes de aprobar. No extrapolar el CI verde de main a esta PR.
- No se ha simulado agotamiento físico del disco ni corte eléctrico/muerte de
  proceso en cada checkpoint. Los errores de escritura impiden publicación;
  esa matriz de interrupciones y la restauración automatizada requieren G1b.
- G1 NO completa: faltan selección/consentimiento por finca, comparación actual,
  binding durable local/Auth/remoto, aislamiento de cuenta en todas las lecturas
  y reserva/acuse RPC. Un recibo de backup no autoriza vinculación ni subida.
- G2 NO iniciada: sin scheduler, sincronización ni web E2E. Ninguna atribución
  automática de fincas legacy. Cola posterior en `POST-G1-TECHNICAL-QUEUE-2026-10-16.md`.
- Sin fusión, despliegue persistente, producción ni APK candidata.
