# Resumen de investigación — Mágina Olivo

Fecha de consolidación: 2026-09-02

## Conclusión principal

Mágina Olivo tiene hueco si no intenta ser un ERP agrícola generalista ni el portal de una cooperativa.

Su propuesta inicial queda definida como:

> Un histórico personal del olivarero que une campo, campaña, entregas, rendimientos, documentos y contexto local, independientemente de la cooperativa o software que use cada almazara.

## Mercado / competencia

### Agroptima

Referencia generalista fuerte para:
- parcelas;
- cuaderno;
- costes;
- stocks;
- SIGPAC;
- órdenes de trabajo;
- offline.

Conclusión: no copiar amplitud. Competir por especialización en olivar, campaña y sencillez.

### Portales de almazara

AM System/ALO Suite/MolturALO, Proyalma/Aicor y Toolagro demuestran que muchas almazaras ya disponen de soluciones propias para entradas, rendimientos, liquidaciones, facturas y documentos.

Conclusión: Mágina Olivo no debe construir un ERP para la almazara. Debe ser neutral y conectar/importar cuando exista autorización.

## Sierra Mágina

La DOP Sierra Mágina publica un universo institucional de 23 almazaras/envasadoras utilizado como base de investigación.

La primera auditoría pública 23/23 muestra heterogeneidad:
- webs corporativas;
- zonas privadas simples;
- portales de socio/cosechero;
- proveedores tecnológicos identificables.

Casos públicos confirmados de Almazaras.com:
- S.C.A. San Sebastián;
- Oleozumo.

La ausencia de portal público localizado no significa ausencia de software interno.

## Integración con cooperativas

Niveles adoptados:

- I0: registro manual;
- I1: documento/foto/PDF;
- I2: CSV/XLSX/export del usuario;
- I3: API/acuerdo oficial;
- I4: adapter de ecosistema/proveedor.

No almacenar credenciales de socio para simular navegación privada.

## Fuentes públicas

### AEMET OpenData

- API REST oficial;
- datos del catálogo accesibles gratuitamente;
- API key;
- situación operativa actual: claves de 3 meses y límite general 40 consultas/min;
- requiere caché y rotación operativa de claves.

### RAIF

- dataset de olivar con actualización frecuente/semanal declarada;
- licencia CC BY 4.0;
- útil como contexto fitosanitario zonal;
- no debe presentarse como diagnóstico de la parcela del usuario.

### SIGPAC Andalucía

- información geográfica 2026 descargable por provincia/municipio;
- condiciones específicas de uso comercial/no comercial;
- requiere atribución `©Junta de Andalucía` y avisos de reutilización según licencia;
- parcela SIGPAC administrativa debe mantenerse separada del concepto de finca/parcela propio del usuario.

### CUE / SIEX / REAFA

Arquitectura preparada para interoperabilidad futura, pero no bloquear la V1 intentando construir un CUE completo antes de validar demanda.

## Producto V1

Núcleo:
- explotación;
- finca;
- parcela;
- campaña;
- entrega;
- resultado/rendimiento;
- labor;
- tarea;
- documento;
- cooperativa/almazara;
- avisos.

Decisiones clave:
- entrega y resultado son entidades separadas;
- una entrega puede existir sin parcela concreta;
- kilos oficiales salen de entregas válidas;
- rendimiento principal ponderado por kilos cuando los datos sean comparables;
- procedencia de cada importación se conserva;
- conflictos no se sobrescriben silenciosamente.

## Automatización

No necesita IA para:
- sumar kilos;
- media ponderada;
- pendientes de rendimiento;
- tareas;
- alertas meteorológicas;
- ingesta RAIF;
- detección de duplicados;
- resúmenes deterministas.

IA futura solo para reducir fricción:
- interpretar texto/voz;
- extraer documentos;
- consultar/resumir datos autorizados.

## Arquitectura técnica adoptada para spike

- React + TypeScript + Vite PWA;
- Node.js + TypeScript + Fastify API;
- PostgreSQL como fuente de verdad;
- object storage privado, R2 candidato;
- Better Auth candidato a validar;
- IndexedDB/outbox para offline;
- jobs/outbox en PostgreSQL antes de añadir colas complejas;
- adapters externos.

PocketBase no se adopta como fuente de verdad productiva V1 debido a su estado pre-v1.0 y la advertencia oficial actual de compatibilidad para aplicaciones críticas.

## Offline

La PWA no dependerá exclusivamente de Background Sync.

Estrategia:
- app shell;
- caché limitada de lectura;
- borradores IndexedDB;
- outbox de escrituras;
- idempotency keys;
- sincronización al abrir/volver online/foreground;
- conflictos explícitos.

## Seguridad y privacidad

- aislamiento por `holding`;
- roles owner/admin/collaborator/viewer preparados;
- documentos privados;
- autorización siempre server-side;
- datos sintéticos en desarrollo;
- secretos fuera del frontend/Git;
- backup + restore obligatorio antes de piloto.

## Coste

La V1 puede operar con coste variable bajo porque IA no está en el camino crítico y las fuentes principales son abiertas/gratuitas bajo sus condiciones.

Cloudflare R2 se ha documentado como candidato por su free tier inicial y ausencia de egress directo, pero el consumo real se medirá antes de decidir producción.

## Piloto

Primera ronda: 3-5 agricultores.

Validar:
- comprensión finca/parcela/campaña;
- entrega <30 s;
- labor simple <45 s;
- resultado posterior <15 s;
- ticket/documento;
- modo offline;
- utilidad de dashboard;
- valor del histórico neutral a cooperativa.

El siguiente salto de certeza no vendrá de más búsquedas web, sino de:
- tickets/albaranes/liquidaciones anonimizados;
- agricultores reales;
- formatos de exportación de portales;
- contactos autorizados con cooperativas/proveedores.

## Estado

Investigación pública y definición funcional suficientemente maduras para comenzar un spike técnico vertical en paralelo a la finalización del prototipo visual, manteniendo el PR de fundación en Draft hasta validar la base.