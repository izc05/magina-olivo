# G1a — copia privada previa a la vinculación

Objetivo: implementar la primera salvaguarda de G1 según
`G1-G2-ACCOUNT-LINKING-SYNC-2026-10-16.md`, sin activar atribución ni red.
El encargo del propietario del 16/10 autoriza implementación secuencial.

## Diseño y límites

Una instantánea lógica de todas las tablas Room (incluidos historial, borrados
y outbox), con los binarios locales referenciados por documentos, se guarda
en `noBackupFilesDir/account-link-backups/<operation UUID>`. No incluye sesiones
Auth ni preferencias externas a Room. No cambia UUID, owner, versión ni outbox.
Una transacción Room mantiene estable la lectura mientras se copia. Una copia
incompleta nunca se publica como válida. Se verifican integridad SQLite,
claves ajenas, tamaño y SHA-256 de cada archivo antes de publicar el directorio.
Repetir la operación verifica la copia existente, sin sobrescribirla.

No se cambia Room v26. No se ofrece todavía un botón de vinculación: faltan
consentimiento, selección, comparación con el estado actual, reserva remota y
aislamiento de cuenta en todas las lecturas. Una copia es un checkpoint, nunca
un permiso para subir datos. No se declara G1 completa con esta entrega.

## Ejecución

- [x] Validar main: foundation, emulador, G0 limpio/legacy; revisar pruebas Room/Auth.
- [x] Añadir pruebas instrumentadas de roundtrip SQLite y bytes no vacíos,
  reintento tras recrear servicio, corrupción, archivo ausente y fallo sin mutación.
- [x] Verificar que fallan antes de implementar `LocalLinkBackup`.
- [x] Implementar `data/repository/LocalLinkBackup.kt` y pasar esas pruebas.
- [x] Revisar cancelación, falta de espacio, URI inválida, concurrencia y copias
  antiguas. Nunca usar una copia antigua como inventario actual de consentimiento.
- [x] Registrar resultados, abrir PR independiente y actualizar #744/#727.

Evidencia: `docs/06-testing/evidence/g1-preservation/REPORT.md`, PR #755.
41 pruebas instrumentadas verdes y 674 JVM; CI de la PR pendiente. La revisión
de cancelación y ENOSPC no equivale a pruebas físicas de interrupción/espacio.

## Revisión

La prueba usa exclusivamente Room/archivos sintéticos en el sandbox de pruebas.
No borrar datos de una app retenida para ejecutar QA. Sin migraciones persistentes,
sin producción, sin fusión y sin APK candidata.
