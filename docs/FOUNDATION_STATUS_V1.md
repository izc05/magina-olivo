# Estado de fundación V1 — Mágina Olivo

Fecha: 2026-09-02
Rama: `feat/foundation-v1`

## Producto

Cerrado a nivel de fundación:
- propuesta de valor;
- alcance V1;
- flujo campaña/entrega/rendimiento;
- labores;
- documentos;
- cooperativas/almazaras;
- automatizaciones;
- IA opcional;
- piloto.

## Investigación

Cerrado a nivel público:
- AEMET;
- RAIF;
- SIGPAC;
- CUE/SIEX/REAFA;
- DOP Sierra Mágina;
- 23 entidades auditadas públicamente;
- ecosistemas Almazaras.com/MolturALO, Proyalma/Aicor y Toolagro;
- competencia Agroptima.

Pendiente de mundo real:
- formatos de exportación de portales;
- documentos anonimizados;
- entrevistas/piloto;
- contacto autorizado con cooperativas/proveedores;
- revisión jurídica específica.

## Diseño

Funcional cerrado:
- mapa de pantallas;
- navegación;
- onboarding;
- wireframes;
- objetivos UX;
- dirección de diseño provisional.

Identidad visual final/prototipo navegable: se desarrolla en paralelo en el hilo visual del proyecto.

## Arquitectura

Candidato adoptado para spike:
- React + TypeScript + Vite PWA;
- Node.js 24 LTS;
- Fastify 5;
- PostgreSQL 18.x;
- Better Auth candidato;
- object storage privado / R2 candidato;
- IndexedDB outbox;
- worker/jobs sobre PostgreSQL inicialmente.

## Contratos técnicos ya documentados

- `API_CONTRACT_V1.md`
- `DATABASE_SCHEMA_V1.md`
- `AUTH_SESSION_V1.md`
- `ENVIRONMENTS_DEPLOYMENT_V1.md`
- `OFFLINE_SYNC_V1.md`
- `OBSERVABILITY_V1.md`
- `THREAT_MODEL_V1.md`
- `BACKUP_RESTORE_PLAN.md`
- `TEST_STRATEGY.md`
- `TECHNICAL_SPIKE_ACCEPTANCE.md`

## Regla de avance

La siguiente fase técnica no es «construir toda la app».

Es ejecutar un spike vertical pequeño que demuestre:

`auth -> holding -> finca -> parcela -> campaña -> entrega -> rendimiento -> ticket -> offline -> sync -> restore`

El spike debe pasar todos los P0 de `TECHNICAL_SPIKE_ACCEPTANCE.md`.

## Lo que NO debe hacerse todavía

- integrar una cooperativa concreta sin contrato/export real;
- introducir IA en el camino crítico;
- construir CUE completo;
- añadir Redis/colas complejas por anticipación;
- crear app nativa antes de probar límites de la PWA;
- almacenar datos reales en desarrollo;
- fusionar fundación a main sin revisar coherencia final de documentos y dirección visual.

## Próximos pasos paralelos

### Hilo visual
- identidad;
- logo;
- pantallas visuales;
- prototipo navegable.

### Hilo técnico/producto
- revisar coherencia documental;
- preparar scaffold del spike cuando se dé inicio a código;
- validar ORM/query builder;
- validar Better Auth;
- probar RLS;
- preparar CI y migraciones;
- conseguir muestras anonimizadas y usuarios piloto.
