# Auditoría #725 — Perfil existente

Estado actual: primer bloque productivo de lectura/copy verificado localmente, con auditoría previa conservada. Resultados y límites en [readability/README.md](readability/README.md). #725 sigue abierta; permisos contextuales, DEMO y Cuenta/Auth/sync pendientes.

Base main 26111d6b. Worktree y rama propios codex/issue725-profile-audit. Se audita el Perfil original: diff de los archivos de Perfil y AppearanceStore entre main y APK DEV instalado 1b94a3b1 vacío. APK de pruebas ya disponible; no nueva candidata ni despliegue. Mapa #746 sin cambios.

## Ejecutado

21/21 instrumentadas pasan en API35, emulador propio emulator-5614. MyProfileScreenTest (7), AppearanceSettingsTest (7), ProfileSettingsContractTest (6), BackupPolicyDeviceTest (1). Resultado agregado y recuento runner en existing-controls.log. Desglose confirmado con las fuentes de los cuatro tests.

Cubren municipio/provincia, cooperativa seleccionada/alta, preferencia de avisos independiente del bloqueo Android, cambio/cancelación/rechazo de apariencia, persistencia tras recreación, configuración nocturna y FLAG_ALLOW_BACKUP desactivado en APK real. Los contratos Room usan profile-settings-contract-test.db propio; la apariencia persistente usa nombre UUID propio. No se vacía la base operativa ni se retira DEMO real. UI de perfil usa callbacks/estado aislados; no equivale a E2E cloud ni al permiso concedido/denegado real.

Matriz 360/390/430 dp, fuente 1.0/1.3 completada: 84/84 ejecuciones (14 por cada uno de seis perfiles). Densidad/fuente originales restauradas. Capturas directas del test de AppRoot real: Perfil con apariencia clara/oscura y selector, sin MyProfile repository real en ese fixture.

## Defectos demostrados en código y captura

- P2 visual, 360 dp/font1.3: título Notificaciones partido como «Notificacione / s», subtítulo elidido al competir con el chip Desactivadas. Captura directa appearance-dark-profile-360dp-font130.png. La prueba de apariencia pasa porque comprueba persistencia/color, no límites de texto; no confundir 14/14 con ausencia de defectos visuales. Propuesta local a Perfil: reservar ancho completo al título/explicación y colocar estado accesible sin competir, conservando la acción y paleta; no modificar MoCompact compartido con el mapa.
- P2 ProfileScreen.kt, fila Modo sin conexión: «nada depende de internet» contradice las fuentes externas detalladas en Ayuda. Propuesta mínima: explicar que los registros del campo se guardan en el teléfono y que los servicios externos requieren conexión; no rediseñar fila.
- P2 HelpScreens.kt, OFFLINE: «Los avisos suenan igual» / «suenan aunque no haya cobertura» promete sonido pese a permiso/canal denegado. NotificationAccess.kt distingue permiso runtime, app y canal; MyProfileSection ya muestra bloqueo y no promete sonido. Propuesta mínima: avisos locales dependen de configuración/permisos del teléfono, con acceso a ajustes existente.
- P1 #462, solicitud contextual: no RequestPermission/POST_NOTIFICATIONS solicitado encontrado en código main; Perfil abre ajustes. Manifest no concede permiso runtime. Requiere flujo probado de aceptar/rechazar/sin bucle y conservar trabajo; no corregido en este inventario.

## Reutilización y límites

Municipio/cooperativa, apariencia, aviso efectivo/canal, ayudas, maquinaria y personas CUE ya existen: conservarlos. DevTools devuelve null en staging y production; AppNavigation limita galería a DEV. DemoFarmSeeder selecciona por marca explícita y contempla legado marcado, no por nombre; retire archiva/cierra/cancela exclusivamente agregados seleccionados. Verificación de idempotencia y finca real con fotos/documentos aún pendiente en fixture nuevo.

Cuenta/login/logout/delete, datos del agricultor, relación real con fincas, colaboración y copia/restauración necesitan #726/#735 y transición respaldada/consentida. Ayuda actual informa de almacenamiento local sin copia cloud y pérdida al desinstalar; no confundir outbox local o backup Android con sincronización segura. Sin consulta/mutación de Supabase producción.

3/3 pruebas adicionales de canales Android reales pasan: canal bloqueado, permitido y todavía no creado. Se usa permiso concedido durante el test; permiso original y flags restaurados exactamente, con evidencia antes/después. No equivale al flujo runtime contextual de aceptar/rechazar #462.

18 capturas originales adjuntas, tres por perfil (selector y Perfil claro/oscuro). Revisadas directamente 360/390/430 dp/font1.3: título roto en 360, descripción elidida en 390 y texto offline elidido también en 430. Los logs verdes de persistencia/apariencia no descartan esos defectos visuales.

Pendientes: captura del resto de controles y hojas; navegación completa MainActivity, permisos/canal reales y regreso, DEMO con adjuntos independientes, prueba física/luz exterior, E2E Auth/sync DEV/STAGING. Nunca cerrar #725 solo por documentación o CI.
## Contrato adicional de avisos

18/18 instrumentadas Room pasan (ReminderPreferencesContractTest 4, AgendaReminderContractTest 14), log reminder-contracts.log. Prueban persistencia de hora al reabrir, desactivar sin borrar avisos, cambiar municipio/avisos sin sobrescribirse, conservación del trabajo PLANNED, retirar alarmas al completar y no reemitir avisos ya vencidos. Los planificadores son RecordingScheduler/FakeScheduler: verifican reconciliación del contrato, no sonido ni entrega de AlarmManager real. Bases propias reminder-preferences-contract-test.db y agenda-reminder-contract-test.db; no datos operativos. No se añade ni modifica código de test/producto en esta entrega.