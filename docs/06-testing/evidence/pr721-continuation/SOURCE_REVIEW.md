# Revisión de fuentes del catálogo #721 — 12/10/2026

Revisión manual de fuentes primarias; se conservan los IDs estables de las cuatro cooperativas, los cuatro colectivos de riego y municipios. No se copian imágenes ni artículos y no se conecta una ingesta automática.

| Registro | Corrección respaldada | Fuente |
| --- | --- | --- |
| Bedmarense | Marca Oro de Magnasur; contacto y domicilio publicados; magnasur.com | https://sierramagina.org/project/s-c-a-bedmarense/ |
| SAT Ntra. Sra. del Camino | Marquesado de Garcíez; CP 23539, dirección/contacto publicados; sustituye la referencia BOE de SAT Fique que era de otra entidad | https://sierramagina.org/project/s-a-t-ntra-sra-del-camino/ |
| Pilar del Andaraje | Denominación, C/ Juan Martín 144, CP 23500, teléfono y sitio pilardeandaraje.es; email heredado retirado al carecer de respaldo | https://sierramagina.org/project/s-c-a-ntra-sra-pilar-del-andaraje/ |
| Cristo de la Misericordia | Camino del Canónigo, CP 23500 y teléfono; email de administración corroborado en el sitio propio | https://sierramagina.org/project/s-c-a-santisimo-cristo-de-la-misericordia/ ; https://laquintaesencia.com/ |
| Capital municipal Bedmar/Jódar | Coordenadas AEMET explícitas; la aproximación heredada no coincide con su fuente | https://www.aemet.es/es/eltiempo/prediccion/municipios/bedmar-y-garciez-id23902 ; https://www.aemet.es/es/eltiempo/prediccion/municipios/jodar-id23053 |
| Jódar / Garcíez | CP 23500 / 23539; corrige 23540 / 23537 | https://www.jodar.es/contacto/ ; directorio SAT anterior |
| Canal del Jandulilla | Identidad y convocatoria de asamblea; no se deducen turnos de riego | https://www.boe.es/diario_boe/txt.php?id=BOE-B-2025-14108 |
| Lagunillas y Cerrón | El boletín anuncia exposición de ordenanzas, no horarios ni una convocatoria de riego | https://www.boe.es/diario_boe/txt.php?id=BOE-B-2026-19273 |
| SAT Fique | Comunidad de regantes con convocatoria en Bedmar; no acredita domicilio Garcíez ni es la SAT Ntra. Sra. del Camino | https://www.boe.es/boe/dias/2025/11/25/pdfs/BOE-B-2025-43655.pdf |
| Caz de los Molinos de Jódar | Convocatoria de asamblea de Jódar; distinguida de otra comunidad homónima de Alcalá la Real | https://bop.dipujaen.es/bop/14-03-2025 |

Se retiran servicios adicionales sin respaldo en estas fichas (crédito, carburantes, suministros, etc.). Su ausencia no significa que la entidad no los preste: significa que este catálogo todavía no los acredita. Estado `verified` se refiere a identidad/directorio, no a vigencia de un horario, domicilio de riego o autorización jurídica. Fecha de revisión del seed fijada al 12/10/2026; insertar offline no vuelve a verificar fuentes.

AEMET bloqueó una petición directa a Bedmar; los datos de coordenadas coinciden en resultados indexados de sus páginas oficial, gráfica y horas. Los enlaces de sitios propios de cooperativas son los publicados por el Consejo Regulador; no se afirma una comprobación HTTP de todos los sitios. No se inventan contactos faltantes. Sectores, turnos, captación y entrega CUE siguen fuera de esta PR.
Validación final del bloque: build DEV + test build correctos, 552 JVM sin fallos, 32/32 Room instrumentadas repetidas. Revisión independiente sin errores concretos; BOP corroborado por lectura primaria del ejecutor (el revisor recibió un error HTTP). CI del nuevo HEAD pendiente, sin merge.
