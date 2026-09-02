# Auditoría de portales y zonas de socio — Mágina Olivo

Fecha de revisión: 2026-09-02

## Objetivo

Determinar qué grado de digitalización presenta cada entidad inscrita en la DOP Sierra Mágina y qué estrategia de integración puede plantear Mágina Olivo sin depender de un proveedor concreto ni automatizar accesos privados sin autorización.

## Universo auditado

El directorio institucional de la DOP Sierra Mágina lista actualmente 23 almazaras/envasadoras:

1. Aceites Campoliva, S.L.
2. Avirol, S.L.
3. Monva, S.L.
4. Oleozumo, S.L.
5. S.A.T. Ntra. Sra. del Camino
6. S.C.A. Bedmarense
7. S.C.A. La Unión del Santo Cristo
8. S.C.A. Ntra. Sra. de la Asunción
9. S.C.A. Ntra. Sra. de la Cabeza
10. S.C.A. Ntra. Sra. de la Paz
11. S.C.A. Ntra. Sra. de los Remedios
12. S.C.A. Ntra. Sra. del Rosario
13. S.C.A. Ntra. Sra. Pilar del Andaraje
14. S.C.A. San Francisco
15. S.C.A. San Isidro Labrador
16. S.C.A. San Juan Bautista
17. S.C.A. San Roque
18. S.C.A. San Sebastián
19. S.C.A. Santa Isabel
20. S.C.A. Santísimo Cristo de la Misericordia
21. S.C.A. Trujal de Mágina
22. S.C.A. Unión Oleícola de Cambil
23. Thuelma, S.L.

Fuente institucional:
- https://sierramagina.org/almazaras-envasadoras/

## Clasificación de madurez digital

### Nivel P0 — Web pública/corporativa

Web informativa, contacto, noticias o tienda, sin evidencia pública suficiente de un portal individual de socio.

### Nivel P1 — Zona privada simple

Existe una sección restringida o protegida, pero no se ha verificado que exponga datos estructurados individuales de campaña.

### Nivel P2 — Portal de socio estructurado

Existe evidencia pública de acceso individual a datos como entregas, rendimientos, facturas, liquidaciones o documentación.

### Nivel P3 — Ecosistema/app conectada

Existe un proveedor o aplicación conectada al software de almazara con funciones estructuradas y potencial de integración futura mediante acuerdo.

## Hallazgos confirmados

### S.C.A. San Sebastián — La Guardia de Jaén

**Estado: P2/P3 confirmado.**

La web oficial incluye un enlace explícito `ACCESO SOCIOS` hacia:

- https://sansebastian.almazaras.com

Esto confirma uso del ecosistema Almazaras.com/AM System para el acceso de socios.

Fuentes:
- https://senoriodemesia.es/
- https://sierramagina.org/project/s-c-a-san-sebastian/

Implicación para Mágina Olivo:
- no automatizar login ni scraping del área privada;
- priorizar importaciones de documentos/CSV si el usuario puede obtenerlos;
- explorar en el futuro un acuerdo con la cooperativa o con el proveedor;
- mantener el modelo de datos neutral al proveedor.

### S.C.A. Ntra. Sra. del Rosario — Arbuniel

**Estado: P1/P2 probable, proveedor no confirmado.**

La web oficial de Albilia muestra de forma pública un botón `Acceso Socios`.

Fuente:
- https://albilia.es/

No se ha verificado públicamente el proveedor tecnológico ni el conjunto exacto de datos ofrecidos tras autenticación.

Implicación:
- registrar que existe canal digital de socio;
- no asumir compatibilidad con Almazaras.com;
- investigar exportaciones disponibles con una cuenta piloto autorizada o contacto directo.

### S.C.A. Ntra. Sra. de la Paz — Bélmez de la Moraleda

**Estado: P1/P2 probable, proveedor no confirmado.**

La web oficial de La Perla de Mágina muestra `Acceso socios` y una ruta `/socios/` separada del área comercial `Mi cuenta`.

Fuentes:
- https://laperlademagina.es/
- https://laperlademagina.es/socios/

El contenido autenticado no se ha inspeccionado.

Implicación:
- tratar la zona como fuente privada no automatizable sin permiso;
- comprobar en piloto si ofrece descarga de albaranes, liquidaciones o resúmenes.

### S.C.A. San Roque — Carchelejo

**Estado: P1 confirmado.**

La web contiene una sección `Socios` protegida mediante contraseña genérica de WordPress. La parte pública no demuestra que sea un portal transaccional por usuario.

Fuente:
- https://scasanroque.com/socios/

Implicación:
- no considerarla una API ni un portal estructurado;
- puede ser útil como canal privado de avisos/documentos;
- Mágina Olivo puede mejorar esta experiencia mediante un centro de información unificado, pero sin copiar contenido privado.

### S.C.A. Unión Oleícola de Cambil

**Estado: P1/P2 probable, proveedor no confirmado.**

La web de Esmeralda de Mágina incluye una `ZONA DE SOCIOS` con entrada restringida y mantiene además una categoría de `Noticias internas`.

Fuentes:
- https://esmeraldamagina.es/socios/
- https://esmeraldamagina.es/category/noticias-internas/

La cooperativa publica que tramita liquidaciones, albaranes y facturas desde sus oficinas, pero no se ha verificado qué parte de esa información está disponible online al socio.

Implicación:
- candidato prioritario para entrevista/piloto;
- posible valor inmediato de Mágina Olivo como archivo personal de documentos y avisos de campaña.

### S.C.A. San Isidro Labrador — Huelma

**Estado: P0 confirmado para socio agrícola; e-commerce con cuenta de cliente.**

La web permite crear cuenta de usuario para la tienda online, pero esa cuenta no debe confundirse con un portal de socio agrícola.

Fuentes:
- https://www.scasanisidro.es/
- https://www.scasanisidro.es/iniciar-sesion?create_account=1

La entidad cuenta con más de 1.500 socios y servicios de fitosanitarios, abonos y gasóleo, por lo que es candidata estratégica para validar necesidades reales.

### S.C.A. San Francisco — Albanchez de Mágina

**Estado: P0 en la auditoría pública actual.**

Se ha localizado web corporativa/tienda y noticias, pero no un portal individual de socio verificable.

Fuentes:
- https://www.aovesierramagina.com/
- https://sierramagina.org/project/s-c-a-san-francisco/

### S.C.A. Ntra. Sra. de la Asunción — Albanchez de Mágina

**Estado: P0 en la auditoría pública actual.**

La web dispone de tienda, contacto y noticias para socios, incluida información de asambleas, pero no se ha encontrado un acceso individual estructurado de socio.

Fuentes:
- https://cooperativadealbanchez.com/
- https://sierramagina.org/project/s-c-a-ntra-sra-de-la-asuncion/

### S.C.A. San Juan Bautista — Solera

**Estado: P0 en la auditoría pública actual.**

La web pública describe cooperativa, instalaciones y producto, sin portal individual de socio visible.

Fuente:
- https://castillodesolera.com/

### S.C.A. Santa Isabel — Torres

**Estado: P0 en la auditoría pública actual.**

La web pública está orientada a cooperativa, producto y venta. No se ha localizado un área individual de socio verificable.

Fuentes:
- https://santaisabeldetorres.com/
- https://sierramagina.org/project/s-c-a-santa-isabel/

### S.C.A. Ntra. Sra. de la Cabeza — Campillo de Arenas

**Estado: pendiente de verificación P0/P1.**

Existe web oficial y una base amplia de socios, pero no se ha confirmado durante esta pasada una zona individual de socio.

Fuentes:
- https://www.cooperativacampillodearenas.com/
- https://sierramagina.org/project/s-c-a-ntra-sra-de-la-cabeza/

### S.C.A. Ntra. Sra. de los Remedios — Jimena

**Estado: P0 en la auditoría pública actual.**

La web pública de Oro de Cánava ofrece información corporativa y comercial, sin portal individual de socio localizado en esta pasada.

Fuentes:
- https://www.orodecanava.com/
- https://sierramagina.org/project/s-c-a-ntra-sra-de-los-remedios/

### S.C.A. La Unión del Santo Cristo — Cabra del Santo Cristo

**Estado: P0 en la auditoría pública actual.**

La web pública de Salud Sierra ofrece información corporativa, trazabilidad de producto y comercio, sin portal individual de socio localizado.

Fuentes:
- https://saludsierra.es/
- https://sierramagina.org/project/s-c-a-la-union-del-santo-cristo/

### S.C.A. Trujal de Mágina — Cambil

**Estado: P0 en la auditoría pública actual.**

La web localizada es principalmente corporativa/informativa. No se ha confirmado un portal individual de socio.

Fuente:
- https://www.scatrujaldemagina.com/

### S.A.T. Ntra. Sra. del Camino — Garcíez

**Estado: P0.**

Entidad pequeña con presencia pública básica. No se ha localizado portal de agricultor/socio.

Fuente:
- https://sierramagina.org/project/s-a-t-ntra-sra-del-camino/

### Thuelma, S.L.

**Estado: no aplica como cooperativa de socios / P0 corporativo.**

Es una sociedad mercantil incluida en el directorio DOP. Su web está orientada a compañía y producto, no a un portal cooperativista.

Fuente:
- https://www.thuelma.es/

## Proveedores tecnológicos relevantes

### AM System / ALO Suite / Almazaras.com / MolturALO

MolturALO se presenta como aplicación que conecta al agricultor con almazaras que utilizan ALO Suite. La descripción pública incluye:

- entradas de productos;
- rendimientos;
- liquidaciones;
- entregas a cuenta;
- facturas;
- albaranes;
- DAT;
- mapas y parcelas;
- estadísticas;
- seguimiento de transporte.

Fuentes:
- https://apps.apple.com/es/app/molturalo/id6444869462
- https://senoriodemesia.es/

Conclusión:

Mágina Olivo no debe competir construyendo un ERP para la almazara. Debe ser el espacio del agricultor y, cuando exista permiso, consumir/exportar datos de este tipo de sistemas.

### Proyalma APP / Aicor

Existe otro ecosistema de gestión para almazaras con app de agricultor. Proyalma APP declara acceso a:

- entradas;
- rendimientos;
- anticipos;
- liquidaciones;
- facturas;
- albaranes;
- historial;
- documentación.

Fuente:
- https://aicor.com/proyecto/proyalma-app/

Conclusión:

El mercado no tiene un único proveedor. Diseñar una integración directa acoplada a Almazaras.com sería un error arquitectónico.

### Toolagro

Toolagro ofrece software de almazaras con parcelario SIGPAC, tickets de entrada, liquidaciones, anticipos, trazabilidad y estadísticas.

Fuente:
- https://toolagro.com/almazaras/

Conclusión:

La neutralidad de proveedor debe ser requisito del producto desde V1 aunque las integraciones reales lleguen después.

## Modelo de integración recomendado

### I0 — Sin integración

El agricultor registra manualmente sus entregas y rendimientos.

Debe ser completamente funcional en V1.

### I1 — Importación documental

El agricultor sube:

- foto de ticket;
- PDF;
- albarán;
- liquidación.

Mágina Olivo guarda el original y prepara un registro editable.

Puede hacerse sin IA inicialmente mediante entrada manual asistida; OCR/IA sería una mejora posterior.

### I2 — Importación estructurada por usuario

CSV, XLSX u otro fichero que el propio usuario descargue de su portal.

Requiere:
- parsers por formato;
- deduplicación;
- trazabilidad del origen;
- vista previa antes de confirmar.

### I3 — Integración oficial con proveedor/cooperativa

API, export programado, webhook u otro mecanismo autorizado.

Nunca almacenar contraseñas del portal de socio para simular la navegación humana.

### I4 — Conector de ecosistema

Si un proveedor como AM System, Aicor u otro acepta colaborar, crear un adapter independiente:

`Provider -> Adapter -> modelo canónico Mágina Olivo`

Nunca:

`Provider -> modelo interno específico del proveedor`

## Datos canónicos mínimos de una entrega

Para poder importar desde cualquier proveedor, la entidad `delivery` debe soportar como mínimo:

- `id` interno;
- campaña;
- agricultor/propietario;
- explotación/finca/parcela opcional;
- cooperativa/almazara;
- fecha y hora;
- kilos;
- tipo de aceituna/variedad opcional;
- suelo/vuelo si se usa;
- referencia externa opcional;
- ticket/albarán original opcional;
- proveedor de origen opcional;
- identificador externo opcional;
- estado de verificación;
- rendimiento asociado opcional;
- hash/dedup key.

## Hallazgo de producto

La heterogeneidad digital de Sierra Mágina es una oportunidad.

El valor de Mágina Olivo no es que todas las cooperativas tengan el mismo software, sino precisamente lo contrario:

> el agricultor conserva un histórico único de su olivar aunque cambie de cooperativa, entregue en varias almazaras o cada entidad utilice un sistema distinto.

## Próximas comprobaciones

- Auditar las entidades restantes hasta alcanzar 23/23 con nivel de confianza.
- Contactar con 2-3 cooperativas piloto y preguntar qué proveedor de gestión utilizan.
- Preguntar si el socio puede descargar CSV/XLSX/PDF de entregas y rendimientos.
- Preguntar si admiten integración externa o exportación periódica autorizada.
- Conseguir ejemplos anonimizados de ticket, albarán y liquidación.
- Verificar si los identificadores de parcela SIGPAC aparecen en los documentos de campaña.
