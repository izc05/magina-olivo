# #722 — bloque 1, selección bajo el dedo

Base main e21972e9. Corrige inspección: solo un candidato cuyo interior contiene el punto, por referencia única; elimina fallback al primer resultado cercano. Huecos, bordes y zonas con varios candidatos no eligen automáticamente. Polygon/MultiPolygon y selección de parcelas guardadas conservados. No modifica UI, cálculo de superficie, datos ni proveedor Catastro.

TDD: 16 pruebas FarmMapViewModelTest, cuatro fallos antes (camino entre parcelas, solapamiento, borde, hueco); MultiPolygon ya pasaba. Después build DEV/pruebas y 574 JVM sin fallos. Revisión independiente sin defectos concretos. Tolerancia WGS84 1e-9 (~0,1 mm) para bordes numéricos; no se promete acertar una parcela con toque ambiguo.

Bloque parcial de #722: búsqueda de municipios/parajes, panel compacto, capas/PNOA y mini mapa quedan pendientes. No se declara #722 cerrada. QA visual completa y CI pendientes; no APK candidata ni cambios a Supabase.