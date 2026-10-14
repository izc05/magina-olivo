# Perfil #725 / PR #749 — primer bloque productivo

Base main 73e67bee40ab02e3d61f2fa63bb1d8f9afff3034, mapa #746 integrado con autorización. Worktree propio issue725-profile-audit; se conserva la auditoría previa. Este bloque corrige lectura y copy; no cierra #725 ni #462.

La prueba nueva reprodujo en 360 dp/font1.3, claro y oscuro, el título Notificaciones dividido en dos líneas (title-before.log). Dos filas privadas de Perfil conservan paleta, borde, icono, tipografías, mínimo táctil, rol/acción y estado. El estado queda bajo la explicación, sin disputar ancho al texto. Títulos/explicaciones usan el ancho disponible y no se eliden. No se modifica MoCompact compartido con el mapa.

Modo sin conexión explica guardado local y conexión necesaria para actualizar mapas/tiempo/otros datos. Ayuda aclara que recibir avisos depende de activación y permisos y que sonido/vibración dependen del teléfono. No se añaden controles de Cuenta inexistentes ni se simulan copias o sincronización.

## Evidencia local final — 2026-10-14

- Build DEV/test y 626 JVM: cero fallos/errores/omitidas, build-jvm.log.
- 54/54 ejecuciones instrumentadas: ProfileReadabilityTest (2) y AppearanceSettingsTest (7) en seis perfiles 360/390/430 dp × fuentes1.0/1.3. La prueba nueva comprueba composición real del texto (líneas/overflow/elipsis), estado desactivado, acción accesible y fila informativa sin falsa acción. La apariencia usa AppRoot real con stores de prueba aislados y comprueba cambios, persistencia/recreación, cancelación/rechazo y configuración nocturna.
- 24 capturas de las dos filas y18 capturas AppRoot/selector recuperadas; se revisan comparaciones grandes. La captura con429dp corresponde al objetivo430 por cuantización de densidad. Las pruebas no acreditan TalkBack ni E2E cloud.
- Revisión independiente sin defectos concretos. Fuente productiva limitada a ProfileScreen.kt y HelpScreens.kt. Datos, Room, cálculos y mapa conservados.

Diagnóstico intermedio: a fuente normal, Compose informaba didOverflowWidth porque el párrafo medía 732 px y el nodo 599 px, aunque la línea terminaba en 598.285 px. No se presentó como glifos realmente recortados. Se hizo explícita la caja de ancho completo y se mantuvo la aserción; matriz final verde. Ver text-width-diagnostic.log.

La matriz terminó sus 54 pruebas antes de un fallo al copiar capturas internas a sdcard: run-as no puede crear ese destino bajo Scoped Storage. El exportador separado usa adb exec-out y copia binaria directa, valida la firma PNG y recuperó 18/18 sin modificar archivos/permisos de la app. La densidad/fuente se restauraron por finally. No se repitieron pruebas aprobadas por un problema de transporte.

Reproducción: `.github/scripts/verify-profile-readability.ps1 -Serial emulator-5614`; exportación separada: `.github/scripts/export-profile-captures.ps1 -Serial emulator-5614 -OutputDirectory ruta-propia`. Solo emulador explícito y paquete DEV. No pm clear ni APK candidata.

GitHub Actions del SHA publicado se verifican por separado en PR749/#744; los resultados de la auditoría d5c4ad19 no se atribuyen al código nuevo. Permiso contextual, entrega real de notificaciones, DEMO con adjuntos independientes y preparación de Cuenta continúan pendientes; #462 se trabaja en worktree propio, sin Supabase producción.