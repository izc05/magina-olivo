# Cierre técnico del mapa #746

La rama existente conserva su implementación y se actualizó con main 065a4c515e8574e7254319cc3b577df6483b35b1 (integración de #748). No cambia cálculos, Room, Web V3 ni diseño.

Dos defectos reproducidos y corregidos:
- Android >=30 podía esperar el tiempo límite de la plataforma al solicitar GPS sin señal. Ahora termina/cancela a los ocho segundos, con la misma política de calidad anterior.
- La rotación perdía la cámara manual: la prueba esperaba zoom 17.25 y observaba 16.5. Se conserva CameraPosition, el foco consumido y una huella SHA-256 de los límites guardados. La huella evita guardar GeoJSON potencialmente grande en el Bundle.

Pruebas locales usan exclusivamente el AVD propio API35 emulator-5614 y fixtures sintéticas. MainMapNavigationTest navega en MainActivity entre dos fincas y recrea la actividad con Room temporal; restaura DB original y preferencias. NativeMapDeviceQaTest usa FarmMapRoute/ViewModel/MapLibre reales con Room en memoria. Sus coordenadas GPS provienen de un proveedor de prueba Android, no de un teléfono físico.

La prueba optativa LivePnoaOfflineRecoveryTest sí accedió a IGN: calentó el encuadre, recreó MapView sin red y observó 20 cargas nativas desde caché; después de recuperar red y pulsar la lógica de reintento observó 10 cargas nativas desde red. Comprobó imagen no vacía, geometría y cámara. Ver pnoa-recovery/ y pnoa-recovery.log. Esto demuestra recuperación del encuadre previamente visitado; no promete cobertura offline de zonas nunca descargadas.

Las pruebas de permiso aproximado comprueban el rechazo honesto de la ubicación obfuscada del emulador (~2 km), que excede el límite existente de 250 m. No se presenta como ubicación precisa ni se realiza búsqueda catastral automática.

## Comprobación pendiente en teléfono físico

Usar una compilación DEV de la revisión aprobada y una finca de prueba, sin modificar datos reales. Registrar modelo, Android, SHA, permisos, conectividad, precisión y capturas:
1. Al aire libre, denegar ubicación y repetir denegación. Comprobar explicación y acceso a Ajustes; regresar sin conceder y comprobar que no aparece una posición inventada.
2. Conceder ubicación precisa y pulsar Mi ubicación. Comprobar posición real, coherencia espacial y límite de espera. Desactivar ubicación y comprobar aviso; en interior sin señal, comprobar finalización sin punto falso.
3. Conceder solo aproximada. Si el proveedor devuelve una ubicación útil, debe indicarse aproximada; si excede el límite de calidad debe rechazarse. Nunca buscar Catastro automáticamente desde una posición aproximada.
4. Visitar PNOA, activar modo avión y apagar Wi-Fi. Girar, encuadrar y comprobar límites guardados y el área ya cacheada. Recuperar conexión y reintentar imágenes. Anotar áreas sin caché.
5. Mover y ampliar manualmente, girar ida/vuelta; cambiar entre dos fincas de prueba. Comprobar cámara y que no aparecen parcelas de la finca anterior. Repetir con fuente grande y modo oscuro.

La precisión GNSS, condiciones de campo y compatibilidad del fabricante siguen sin prueba física. No se inventan resultados ni se genera APK candidata.
## Reproducción

Compilar DEV y tests con JBR de Android Studio y Gradle 9.4.1. Instalar únicamente en el AVD propio; no usar `pm clear`.

- JVM: `gradle :app:testDevDebugUnitTest --no-daemon`.
- Matriz de ciclo de vida: `.github/scripts/verify-map-lifecycle.ps1 -Serial emulator-5614`.
- Mini mapa/ampliación: `.github/scripts/verify-parcel-preview.ps1 -Serial emulator-5614`.
- Estados GPS/red: `.github/scripts/verify-map-device.ps1 -Serial emulator-5614 -Theme light` y `-Theme dark`.
- Guion exacto de CI: `ANDROID_SERIAL=emulator-5614 bash .github/scripts/verify-map-device.sh output-directory` (adb en PATH).
- PNOA real optativo: `adb -s emulator-5614 shell am instrument -w -r -e live_pnoa_recovery true -e class com.isivoltpro.maginaolivo.LivePnoaOfflineRecoveryTest com.isivoltpro.maginaolivo.dev.test/androidx.test.runner.AndroidJUnitRunner`.

El guion de estados revoca permisos entre procesos, porque hacerlo desde una instrumentación puede terminar su propio proceso. Restaura concesiones, flags de denegación y selección de precisión, appop de mock location y ajustes de GPS/red. El auxiliar `restore-accuracy` vive exclusivamente en el APK de tests, exige el paquete DEV y emulador y restaura solo el bit original de selección de precisión de Android; el producto no obtiene privilegios nuevos.

## Resultado local final (2026-10-13)

| Verificación | Resultado |
| --- | --- |
| JVM DEV | 626; 0 fallos, errores y omitidas |
| Lint DEV | 0 errores; 46 advertencias y 15 sugerencias conservadas en lint-results.txt |
| Guion Bash exacto de CI, estados reales Android | 9/9; restauración 1/1 |
| Estados Android en oscuro, guion PowerShell | 9/9; restauración 1/1 |
| Denegación y posición precisa, 360 dp/font1.3/oscuro | 2/2; restauración 1/1 |
| Cambio de finca y rotación en FarmMapRoute | 12/12 (360/390/430 dp × font1.0/1.3 × claro/oscuro) |
| Mini mapa, ampliación, error raster y fallback | 12/12, misma matriz; el nombre de captura 429dp corresponde al objetivo430 por cuantización de densidad |
| Búsqueda, capas, escala, insets/cámara y selección | 16/16, map-regression.log |
| MainActivity/NavController/Room: finca A→B y recreación | 1/1, main-navigation.log |
| IGN/PNOA real, caché sin conexión y recuperación | 1/1, pnoa-recovery.log |

Las cifras de las matrices son ejecuciones de casos repetidos bajo distintas configuraciones, no métodos de prueba únicos. Las tres ejecuciones del auxiliar de restauración no se cuentan como funcionalidad de mapa. El build y las pruebas locales se ejecutaron sobre el árbol de código que se publica en el commit de esta entrega, partiendo de HEAD de integración05e41070c85a68d69f2853191c14e986000e7ee8; los hashes siguientes identifican fuente y APK local. GitHub Actions debe comprobar por separado el SHA final publicado: consultar PR746 y la entrega en #744. Los anteriores controles verdes de6e0ad546 no validan estas correcciones.
