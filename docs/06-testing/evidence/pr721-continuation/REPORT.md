# PR #721 — continuación Room (12/10/2026)

Base heredada: `70741cbc35416dc197bfd4f2fdee2fbace8e5d52`. Conserva las cuatro tablas y la migración aditiva 25→26 de Antigravity, sin alterar tablas agrícolas ni UI.

Cinco regresiones nuevas sobre Room real fallan antes y pasan después: ID de agenda reutilizado entre workspaces, parcela de otra cuenta, fecha de creación sobrescrita, avisos borrados por REPLACE/CASCADE al refrescar comunidad y publicaciones oficiales con fecha inventada. Los upserts de catálogos no borran padres; la agenda valida pertenencia dentro de una transacción y preserva su creación. El feed municipal queda vacío hasta disponer de publicaciones verificadas.

Validación local: Gradle `testDevDebugUnitTest assembleDevDebug assembleDevDebugAndroidTest` correcto, 552 JVM sin fallos. Instrumentación focalizada: 32/32 (5 regresiones + 27 migraciones Room), incluyendo conservación de finca, parcela, campaña, pesada, jornada, gasto y documento en 25→26 y upgrade desde todas las versiones soportadas. AVD desechable separado `MaginaOlivo_Codex_PR721_API35_20261012`, serial emulator-5612; datos sintéticos en memoria y fixtures de migración, sin tocar el emulador previo de Claude ni datos Gate21. No APK candidata.

Revisión independiente de solo lectura: sin bloqueos; comprobada generación Room de transacciones y métodos protected. Schema JSON no cambia porque no se cambia DDL.

Pendiente antes de autorizar merge: revisión/corrección de fuentes del catálogo heredado y controles GitHub del nuevo HEAD. No se declara esta PR completa por los CI históricos de otro SHA.