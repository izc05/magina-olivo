# #462 — solicitud al guardar el primer recordatorio

Base: `main` b5e3357da46147cd38ba008461c6713a76a05199, integración autorizada de #750.

La creación entrega el UUID tras confirmar el guardado y terminar su estado de
guardado. El Host consulta el agregado persistido: trabajo PLANNED activo,
preferencia habilitada y recordatorio futuro, activo, no disparado ni borrado.
Entonces explica el permiso y utiliza el diálogo nativo Android 13+. No modifica
el trabajo, recordatorio, preferencias, calendario, cálculos ni notificador.
La política ya integrada evita repetir la solicitud al guardar otro aviso elegible.
El detalle también conecta sus guardados/planificación mediante OnEachSave.

## Evidencia local

- 641 JVM, cero fallos/errores (`jvm-summary.json`). Cuatro pruebas nuevas cubren
  UUID confirmado, estado de guardado terminado, fallo de persistencia, validación
  y compatibilidad de los llamadores que no proporcionan callback.
- `issue462-first-save-red.log`: 4 pruebas, 1 fallo real antes de implementar la
  entrega del UUID; `issue462-first-save-build.log`: compilación y JVM correctas.
- Dos pruebas instrumentadas de base: creación real y filtros de elegibilidad.
- Ocho ejecuciones del primer aviso: baseline/aceptar/rechazar/Ahora no, en
  360 dp oscuro y 390 dp claro, fuente 1,3. Cada ejecución guarda dos trabajos con
  recordatorios futuros, verifica su persistencia y evita repetir el diálogo.
- Cuatro regresiones MainActivity/Perfil de #750 y dos de legibilidad de #749.
  Total: 16 ejecuciones instrumentadas finales, sin contar iteraciones diagnósticas.
- El nuevo flujo usa FarmActivitiesRoute, ViewModel y repositorios Room reales
  en ComponentActivity con el contenedor de prueba equivalente al formulario.
  No acredita por sí solo la navegación completa de MainActivity hacia ese formulario.
- Capturas en `captures`; lectura visual de explicación/guardado con fuente grande.
- Se corrigió el montaje de prueba: sus componentes hermanos necesitaban el
  contenedor vertical, fondo e insets que tiene la pantalla real. No fue un cambio
  de diseño productivo. Las matrices finales utilizan el contenedor corregido.
- Fixture UUID conserva/restaura base y preferencias originales. Los scripts
  exigen QEMU y paquete DEV, preservan POST_NOTIFICATIONS y verifican igualdad
  exacta de permiso/flags antes/después. No se opera un teléfono físico.
- `apk-sha256.txt` identifica binarios DEV/test utilizados; no hay APK candidata.

## GitHub y límites

Gate 3 ejecuta la nueva prueba y los cuatro modos Android con el script existente
parametrizado por clase; conserva la matriz anterior de Perfil y mapa. Resultados
remotos deben verificarse en el SHA publicado, separadamente de estas pruebas locales.

## Ampliación de cierre Android (14 octubre)

`closure` contiene la compilación/JVM final y 25 ejecuciones instrumentadas:
9 de base y 16 de matriz. Se conserva arriba la evidencia de la entrega anterior.
La matriz usa 360 dp oscuro y 390 dp claro, fuente 1,3; repite creación y permiso
en sus cuatro modos, ficha/recreación y las cuatro regresiones de Perfil en 390.
Todos los scripts restauran exactamente POST_NOTIFICATIONS y sus flags; al
terminar se restauraron densidad física 420, fuente 1,0 y modo nocturno original.

MainReminderPersistenceTest abre la ficha en MainActivity mediante el Intent real:
una escritura rechazada por trigger SQLite en la base aislada conserva DRAFT y
el recordatorio íntegro, no solicita permiso y permite reintentar. Planificar
correctamente solicita la explicación; recrear con el diálogo abierto lo conserva.
Editar después mantiene UUID/fecha del recordatorio y no duplica la solicitud.
Pasar a segundo plano y volver conserva el agregado. Revisar notificaciones abre
Ajustes Android reales sin otro diálogo. Un canal bloqueado de UUID sintético
abre los ajustes de canal cuando POST está concedido; con POST denegado abre los
ajustes de aplicación. Se elimina solo ese canal de prueba, nunca el canónico.

FirstReminderPermissionTest bloquea el escritor WAL en una base `isolated-main-`:
recrea ComponentActivity mientras el formulario/ViewModel productivo sigue
guardando; al liberar el bloqueo verifica trabajo/aviso y la explicación contextual.
Es evidencia de recreación durante escritura, no una prueba de muerte del proceso
antes del commit ni de navegación completa de creación desde Inicio en MainActivity.

Revisión estática de estas ampliaciones sin defectos importantes. El control de
evidencias del SHA anterior 6b2aa007 se canceló porque desapareció el AVD; el log
diagnóstico quedó esperando dispositivo en `adb logcat`. Se limita cada comando
diagnóstico a 10 segundos para conservar y reportar el fallo. No se aumenta el
timeout del job ni se convierte un fallo en éxito. GitHub debe confirmar los tres
controles del nuevo SHA antes de solicitar merge. No se cierran issues antes de
integración autorizada.

## Comprobación física pendiente

### Corrección posterior de la carrera de renderizado en QA del mapa

En `68f1648b`, foundation y gate3-evidence fueron verdes; gate3-emulator falló
solo en el modo GPS grant, al consultar una vez el contorno inmediatamente después
del aviso de ubicación. El control de evidencias del mismo SHA sí pasó ese modo.
La revisión confirma que activar el punto cambia el estilo y repuebla las fuentes:
[GeoJsonSource documenta que las actualizaciones asíncronas aún no son consultables
al volver de setGeoJson](https://maplibre.org/maplibre-native/android/api/-map-libre%20-native%20-android/org.maplibre.android.style.sources/-geo-json-source/index.html).
La prueba ahora espera hasta 15 s el MISMO contorno, ID y capa, como ya hacía al
abrir el mapa. Mantiene la aserción final: no acepta pérdida permanente. Acredita
recuperación acotada, no ausencia de parpadeo. No modifica el mapa productivo.
`closure/map-render` conserva nueve modos GPS y la restauración de exactitud
(10/10), todos correctos, compilación/JVM y hashes de los binarios empleados.
Permisos, GPS, red y appop mock se restauraron sin limpiar datos.

En `88a4382e` se repitió el cierre local completo sobre el commit publicado:
641 JVM, 25 notificaciones/Perfil y 10 mapa/restauración, todo correcto.
Registros y verificación SHA en el directorio local `%TEMP%/issue751-final-88a4382e`.
Los controles remotos de emulador fallaron antes de arrancar: SDK Manager recibió
`Error on ZipFile unknown archive` para `system-images;android-35;default;x86_64`,
también al reintentar. Los workflows usan ahora Android 35 `google_apis` x86_64
Pixel 6, igual que el AVD local validado. No cambian API, tests, opt-in de seguridad,
permisos exigidos, tamaños ni timeout. Requiere nuevos controles verdes del HEAD.

La descarga Google APIs también tuvo un fallo de ZIP antes de arrancar. Se añade
preinstalación del paquete con tres intentos de 120 s y limpieza de descargas
parciales solo dentro del SDK del runner Linux efímero. No reintenta tests ni usa
continue-on-error: tres fallos o archivos incompletos dejan el job rojo. Cinco
casos de SDK falso validan recuperación, fallo permanente, instalación incompleta
y conservación del SDK local/rutas ajenas; las seis guardas ADB siguen verdes.
La revisión estática no encontró defectos importantes. El arranque y QA reales,
no la presencia de archivos ni estos mocks, deben confirmar la integración CI.
Incidente equivalente del action: https://github.com/ReactiveCircus/android-emulator-runner/issues/496.

Tras autorizar el gate/build para un dispositivo de pruebas DEV, sin datos reales:
guardar un trabajo sintético con aviso a unos minutos, comprobar que permanece al
aceptar/rechazar/Ahora no, cerrar la aplicación y esperar sin cambiar el reloj.
Con permiso concedido, canal activo y restricciones de batería conocidas, verificar
entrega, apertura de la ficha al tocar el aviso y sonido/vibración conforme a Ajustes
Android. Repetir con canal bloqueado y tras regresar de Ajustes. Registrar modelo,
SDK, SHA/build, hora programada/recibida y estado de permisos/canal/batería.
No borrar datos ni cambiar canales de la app personal. No se ha ejecutado esta
comprobación física y no se genera una APK candidata para realizarla ahora.

### Corrección de la prueba de navegación tras recreación

En 579d5d45, foundation y gate3-evidence terminaron correctamente. gate3-emulator
falló en MainReminderPersistenceTest.kt:104: No compose hierarchies, al editar
inmediatamente después de reenviar el deep link del mismo trabajo. AppNavigation
maneja ese intent navegando de nuevo a raíz y ficha; la prueba podía encontrar la
ficha anterior y perderla antes del clic. Se elimina únicamente ese segundo intent:
la edición debe usar la ficha restaurada por recreate(), manteniendo todas las
assertions de Room/permisos/Ajustes. La prueba nativa corregida pasa localmente;
revisión independiente sin defectos importantes. No se modifica código productivo.
La primera apertura por deep link sigue probada; no se acredita aquí un segundo
reenvío concurrente del mismo enlace.

En 49004be5 la suite principal falló antes del onboarding: el XML del artefacto
contiene un ANR de Pixel Launcher (paquete android), mientras el arranque de MainActivity
retornó Status: ok. La recuperación preexistente de Quickstep se amplía únicamente
a los títulos exactos Quickstep y Pixel Launcher; no cierra errores de Mágina Olivo
ni de otros procesos. Cinco pruebas sin ADB comprueban ambos launchers, el rechazo
de Mágina/otro launcher y la ausencia del botón Close app. Pixel falla antes de la
corrección y los cinco casos pasan después. No se omiten pruebas de la aplicación.
