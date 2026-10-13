# #723 — ficha de pesada: continuación

Base main `7c49dcd4`; rama independiente `codex/issue723-delivery-detail-continuation`.

## Cambio y alcance

Se reutilizan tema, tarjetas y callbacks existentes. La ficha muestra peso neto, vale, fecha, cooperativa y origen; agrupa Resumen, Vale y pesaje, Parcelas de origen y Notas y foto. La aclaración de jornada queda abreviada y mantiene una descripción accesible sobre suma diaria e identidad de cada vale. Los campos ausentes muestran No registrado; nombres de finca/campaña ausentes se identifican como no disponibles, sin afirmar que la entidad no existe. Los repartos desconocidos siguen Pendiente de distribuir usando el getter existente, sin derivar nuevos repartos.

Editar conserva condiciones y formulario originales, con objetivo mínimo 48×48 dp. Se conserva el contenido real de adjuntos, su propietario y sus callbacks; foto opcional, sin nuevo flujo OCR. Rendimiento, eliminación, navegación, Room, modelos, repositorios, costes, cálculos y PDF no cambian.

## Defectos reproducidos

La ficha original falla ambos tests por ausencia de las tarjetas solicitadas (native-before.log). El control Editar medía 40 dp; se conserva el RED y se añade tamaño mínimo 48 dp (edit-target-before.log). A 360 dp/fuente 1.3, las columnas cortaban registrado dentro de la palabra (large-font-word-before.log y capturas). Se usan filas de ancho completo cuando la fuente grande no cabe, con los mismos datos. A 390 dp/fuente 1.0, el layout intrínseco daba 266 px al texto frente a 272 disponibles; se asigna el ancho completo del contenedor. La prueba verifica el TextLayoutResult real, desbordamiento y saltos en espacios, conservando todos los asserts.

## Verificación

La compilación DEV/debug e instrumental final y 584 pruebas JVM pasan, cero fallos/errores. Revisión independiente sin defectos concretos. Matriz final: 8/8 combinaciones (360/390 dp × fuente 1.0/1.3 × claro/oscuro), con objetivos de edición 48 dp y comprobación real de texto sin recorte ni palabras partidas. Regresiones finales: 18/18 en 49.821 s (DeliveryDetailCardsTest, DemoFarmSeederTest, DemoFarmReportTest, ReportPdfTest y JornadaPesadasContractTest). Se conservan 6.680 kg, cuatro pesadas, tres días, 20,57 %, 0,228 EUR/kg y 1.522,50 EUR; sin modificar los cálculos. Veinte capturas grandes finales y cuatro logs de matriz conservados.

Los tests de UI usan DTO sintéticos y callbacks que fallan ante cualquier escritura o eliminación. Comprueban vales separados de igual fecha, orígenes, valores propios, pesos conocidos/desconocidos, reparto exacto, campos ausentes y campaña no editable. No constituyen un recorrido completo de MainActivity o navegación Back.

Las regresiones DEMO/Room/PDF ejecutan datos sintéticos en el emulador propio MaginaOlivo_Codex_PR722_API35_20261012 (emulator-5614). Antes de esas escrituras se exportaron SQLite, WAL y SHM: archivo local privado `pr723-before-demo-database.tar`, SHA256 F2BC189F833877322AD5E72858EE2B268B1F9A9A92D5993323F4342478E32E96. La base no se incorpora a Git ni se restaura sobre datos actuales. No se borran datos de aplicación ni se modifican dispositivos reales.

## Evidencia y límites

Capturas directas del emulador, sin edición. El script verify-delivery-detail.ps1 exige emulador QEMU explícito y restaura densidad/fuente incluso ante fallo. Gate 3 recoge las capturas instrumentadas. Los logs históricos conservan los fallos previos; la evidencia final se identifica por separado. No APK candidata, Supabase producción, nueva sincronización, prueba física exterior ni promesa de OCR.