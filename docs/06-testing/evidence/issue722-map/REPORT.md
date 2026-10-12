# #722 — selección bajo el dedo y búsqueda de lugares

Base main e21972e9. Corrige inspección: solo un candidato cuyo interior contiene el punto, por referencia única; elimina fallback al primer resultado cercano. Huecos, bordes y zonas con varios candidatos no eligen automáticamente. Polygon/MultiPolygon y selección de parcelas guardadas conservados. No modifica UI, cálculo de superficie, datos ni proveedor Catastro.

Los párrafos siguientes conservan la secuencia de validación del bloque 1; su CI terminó con tres controles verdes en `83fb1fdb`. El bloque 2 y sus límites actuales se detallan debajo.

TDD: 16 pruebas FarmMapViewModelTest, cuatro fallos antes (camino entre parcelas, solapamiento, borde, hueco); MultiPolygon ya pasaba. Después build DEV/pruebas y 574 JVM sin fallos. Revisión independiente sin defectos concretos. Tolerancia WGS84 1e-9 (~0,1 mm) para bordes numéricos; no se promete acertar una parcela con toque ambiguo.

Bloque parcial de #722: búsqueda de municipios/parajes, panel compacto, capas/PNOA y mini mapa quedan pendientes. No se declara #722 cerrada. QA visual completa y CI pendientes; no APK candidata ni cambios a Supabase.
Validación de integración: base main 7c49dcd4 (incluye #745); build DEV/pruebas correctos, 589 JVM cero fallos, 10/10 instrumentadas FarmMapScreenTest/B3NativeRasterErrorTest (incluye ambos temas). AVD nuevo MaginaOlivo_Codex_PR722_API35_20261012, serial emulator-5614; no se instala Room v25 sobre datos v26 ni se toca el AVD anterior. Pantallas/calculadoras sin cambios. CI aún pendiente.

## Bloque 2 — pueblo/paraje, coordenadas y cabecera compacta

La búsqueda de texto usa CartoCiudad IGN y exige elegir una identidad antes de resolver resultados remotos. Las coordenadas tienen su propio campo. Bedmar, Jódar y Garcíez disponen de centros de población verificados mediante `candidates`/`find` el 12/10/2026 y accesibles sin conexión; no son coordenadas de parcelas. Fuente: https://www.cartociudad.es/web/portal/directorio-de-servicios/geoprocesamiento. No se atribuye una parcela a un pueblo ni se guardan datos por buscar.

Una localización correcta cierra teclado y panel; el fallo conserva texto y muestra un error contextual. El panel abierto permite desplazamiento vertical y ocupa como máximo el 60 % del espacio disponible. La selección múltiple queda accesible en el menú; buscar por referencia, polígono/parcela y Mi ubicación permanecen disponibles. No cambia Room, superficie ni cálculos.

Regresiones con resolución diferida reprodujeron dos carreras al tocar el mapa/buscar polígono y una al fallar GPS. Se cancela la búsqueda anterior al cambiar de intención para que no recentre después ni borre el aviso GPS. Los logs `place-cancel-before.log` y `gps-race-before.log` conservan los fallos previos. Revisión independiente final sin defectos concretos pendientes en estos cambios.

Validación visual: `.github/scripts/verify-map-search.ps1` ejecutó 8/8 pruebas (dos temas en cada perfil 360/390 dp × fuentes 1,0/1,3), con mapa nativo y teclado real. Capturas de error con texto conservado y de panel plegado en `search-captures/`; los cuatro logs y `map-search-matrix.log` incluyen resultados. Se restauraron densidad 420 y fuente 1,0; no se borraron datos. Los callbacks del ensayo UI son sintéticos: la consulta real del proveedor se verifica por separado en `LivePlaceProviderSmokeTest` con opt-in `live_place_provider=true`.

La consulta HTTPS real Android a los tres pueblos pasó junto con las ocho pruebas del mapa y dos de fallo raster en ambos temas: 11/11, `map-search-regression.log`. El probe remoto se omite por defecto en CI para no convertir disponibilidad de CartoCiudad en una prueba determinista; las pruebas de parser/identidad/resolución sí se ejecutan siempre.

Build final tras corregir la carrera GPS: `testDevDebugUnitTest assembleDevDebug assembleDevDebugAndroidTest` correcto; 601 JVM, cero fallos/errores, incluidas 23 de FarmMapViewModelTest. La matriz visual es anterior a esa última corrección de cancelación y corresponde al mismo contenido visual; la APK final reinstalada pasó 10/10 ensayos de mapa/búsqueda, `map-final-after-gps.log`.

Entrega parcial: selección y búsqueda cubiertas; mini mapa aéreo, atenuación independiente de capas, reintento PNOA, detalle real z15/z17/z19, escala y QA completa de permisos/offline siguen pendientes. Las capturas muestran carga parcial de PNOA y no acreditan resolución o disponibilidad completa. #722 permanece abierta y #746 DRAFT. No APK candidata ni despliegue Supabase.

## Bloque 3 — reintento de fuentes y encuadre conservado

El aviso de imágenes aéreas no disponibles ofrece Reintentar junto a Solo parcelas. Solo al pulsar Reintentar se solicita una clave nueva para las teselas oficiales; recargar un estilo con URLs idénticas podía reutilizar entradas fallidas sin volver a pedir imágenes. Las URLs habituales y la caché existente se conservan; no se invalida la caché global ni se modifican fuentes GeoJSON o registros. IGN/PNOA, IGN base, Catastro y SIGPAC aceptaron el parámetro adicional en sondeos HTTP200 con contenido de imagen, `retry-provider-probes.txt`. Es una comprobación puntual, no una garantía de disponibilidad continua.

La desaparición del aviso reveló otro defecto: el autoencuadre dependía del tamaño del panel y deshacía un desplazamiento manual. `NativeMapCameraInsetsTest` lo reprodujo en un mapa nativo local: centro 37.6365 sustituido por 37.636000 al retirar el espacio inferior. Ahora el autoencuadre depende de las geometrías y espera dimensiones válidas; el padding cambia conservando centro/zoom. El botón Encuadrar mantiene el encuadre explícito con los insets actuales. `insets-before.log` conserva el fallo previo.

Build DEV/pruebas final correcto, 602 JVM sin fallos/errores. Las seis pruebas nativas finales pasaron: cambio de insets sin perder cámara/selección, dos temas con error real de teselas, reintento realmente nuevo, geometría conservada y fallback local, más tres ensayos de controles/viewport en Scaffold real. `retry-native-after.log`. El primer RED del botón ausente se obtuvo en oscuro; el caso claro tuvo un timeout previo y no se atribuye al botón. Los logs previos distinguen ese resultado del fallo posterior por reutilización de URLs idénticas.

Tras el cambio de encuadre se repitió la matriz de búsqueda completa: 8/8, `retry-matrix.log` y cuatro logs por perfil; capturas actualizadas en `search-captures/`. Además, el aviso/reintento/fallback nativo pasó en claro/oscuro a 360 dp con fuente 1,3: 2/2, `retry-360-large.log`. Densidad/fuente restauradas sin borrar datos. Las capturas del ensayo raster aislado no se usan como captura de la app: ese host no reserva las barras del sistema y la captura de ventana puede adelantarse a un frame GL. La geometría se verifica con hit-test nativo; el viewport de producto se comprueba por separado en Scaffold real.

El detalle PNOA z15/z17/z19, mini mapa aéreo, atenuación independiente de capas, escala y QA integral permanecen pendientes. #722 no se cierra con este bloque.
