# Mágina Olivo — Roadmap

## Estado actual

Producto, investigación pública y diseño funcional muy avanzados. La identidad visual se trabaja en paralelo en otro hilo del proyecto. En esta rama ya queda adoptada una arquitectura técnica candidata, contratos V1 y un gate explícito de spike antes de implementar masivamente el MVP.

## Fase 0 — Producto e investigación

- [x] Definir visión general.
- [x] Diferenciar el producto de una app agrícola genérica.
- [x] Establecer que la plataforma debe funcionar sin APIs de cooperativas.
- [x] Establecer IA como capa opcional.
- [x] Inventariar primera fuente institucional de cooperativas/entidades objetivo de Sierra Mágina.
- [x] Confirmar AEMET + SIGPAC.
- [x] Confirmar RAIF olivar.
- [x] Investigar CUE/SIEX/REAFA.
- [x] Comparar posicionamiento frente a Agroptima.
- [x] Detectar AM System / MolturALO.
- [x] Detectar Proyalma/Aicor y Toolagro.
- [x] Definir niveles P0-P3.
- [x] Completar primera clasificación pública 23/23 de entidades DOP.
- [x] Confirmar San Sebastián y Oleozumo como casos públicos Almazaras.com.
- [x] Revisar condiciones operativas/licencias iniciales de AEMET, RAIF y SIGPAC.
- [x] Documentar caducidad/rate limiting actual de AEMET.
- [x] Documentar RAIF CC BY 4.0.
- [x] Documentar atribución/condiciones SIGPAC para uso comercial/no comercial.
- [x] Definir plan de privacidad/compliance desde diseño.
- [x] Definir plan de piloto con agricultores reales.
- [ ] Identificar proveedor tecnológico de portales prioritarios mediante fuente verificable/contacto autorizado.
- [ ] Confirmar formatos de exportación CSV/XLSX/PDF disponibles para agricultores.
- [ ] Realizar revisión jurídica específica antes de piloto real.
- [ ] Conseguir ejemplos anonimizados de ticket, albarán, rendimiento y liquidación.

## Fase 1 — Diseño funcional

- [x] Cerrar mapa funcional V1 de pantallas.
- [x] Definir navegación móvil principal.
- [x] Definir onboarding inicial.
- [x] Definir modelo de permisos V1 y aislamiento por explotación.
- [x] Endurecer modelo de datos V1 para entregas, resultados, documentos e importaciones.
- [x] Diseñar flujo de campaña.
- [x] Diseñar flujo de entrega y rendimiento.
- [x] Diseñar flujo de labores.
- [x] Diseñar directorio/ficha de cooperativas/almazaras.
- [x] Diseñar centro de avisos.
- [x] Diseñar importación manual/documental neutral a proveedor.
- [x] Definir contrato canónico de importación y deduplicación.
- [x] Cerrar catálogo de tipos de labor/campos mínimos para piloto.
- [x] Crear wireframes funcionales móviles prioritarios.
- [x] Definir dirección de sistema de diseño provisional y criterios WCAG.
- [ ] Cerrar identidad visual final (trabajo paralelo).
- [ ] Crear prototipo visual navegable.
- [ ] Validar flujos con 3-5 agricultores antes de congelar UI.

## Fase 2 — Fundación técnica

### Decisiones y contratos cerrados

- [x] Adoptar React + TypeScript + Vite para PWA.
- [x] Adoptar Node.js + TypeScript + Fastify para API candidata.
- [x] Fijar Node.js 24 LTS como runtime del spike.
- [x] Adoptar PostgreSQL 18.x como fuente de verdad.
- [x] Definir esquema canónico PostgreSQL V1.
- [x] Definir API versionada `/api/v1`.
- [x] Definir idempotencia y concurrencia/409 para escrituras críticas.
- [x] Separar object storage de metadatos de documentos.
- [x] Definir Cloudflare R2 como candidato de object storage productivo.
- [x] Definir Better Auth como candidato de autenticación a validar en spike.
- [x] Definir estrategia de sesiones por cookie HttpOnly/server-side.
- [x] Definir autorización por holding/roles.
- [x] Definir estrategia offline con IndexedDB/outbox/idempotencia.
- [x] Definir que Background Sync es mejora, no dependencia.
- [x] Definir arquitectura jobs/outbox antes de introducir una cola externa.
- [x] Definir adapters para fuentes externas.
- [x] Definir entornos local/CI/staging/production.
- [x] Definir estrategia de despliegue/migraciones/rollback.
- [x] Definir observabilidad V1 sin exponer datos privados.
- [x] Definir threat model V1 y amenazas P0.
- [x] Definir estrategia de pruebas V1.
- [x] Definir backup/restore como gate de piloto.
- [x] Definir spike vertical previo al MVP.
- [x] Definir criterios PASS/FAIL del spike técnico.
- [x] Definir modelo preliminar de costes V1.

### Implementación pendiente

- [ ] Crear workspace/monorepo `apps/web`, `apps/api`, `apps/worker`, packages y db.
- [ ] Fijar package manager/lockfile.
- [ ] Configurar TypeScript strict, linting, formatting y tests.
- [ ] Crear primer esquema/migraciones PostgreSQL ejecutables.
- [ ] Elegir query builder/ORM mediante spike.
- [ ] Implementar auth spike.
- [ ] Implementar autorización por holding.
- [ ] Evaluar PostgreSQL RLS como defensa adicional.
- [ ] Implementar PWA/app shell.
- [ ] Implementar IndexedDB/borradores/outbox.
- [ ] Implementar idempotency middleware/tabla.
- [ ] Implementar control de concurrencia/versiones.
- [ ] Implementar object storage privado.
- [ ] Implementar request IDs/logs/health checks.
- [ ] Implementar primer backup + restauración.
- [ ] Configurar local/test/staging/production reales.
- [ ] Configurar CI.
- [ ] Ejecutar spike vertical completo.
- [ ] Crear `docs/spike/SPIKE_RESULTS.md` con evidencias.
- [ ] Confirmar o sustituir Better Auth según resultados.
- [ ] Confirmar storage productivo según resultados.

## Fase 3 — MVP agrícola

- [ ] Explotaciones.
- [ ] Fincas.
- [ ] Parcelas.
- [ ] Campañas.
- [ ] Entregas.
- [ ] Resultados/rendimientos.
- [ ] Labores.
- [ ] Tareas.
- [ ] Fotografías/documentos.
- [ ] Dashboard de campaña.
- [ ] Exportación básica.
- [ ] Importación CSV propia/genérica.

## Fase 4 — Automatización

- [ ] WeatherAdapter AEMET con caché.
- [ ] Rotación/alerta de API key AEMET.
- [ ] Reglas de lluvia/helada/viento.
- [ ] Recordatorios.
- [ ] Resúmenes de campaña.
- [ ] Recalculo automático de agregados.
- [ ] Centro de ejecuciones/errores.
- [ ] Ingesta RAIF versionada con checksum/parser.
- [ ] Detección de entrega pendiente de rendimiento.
- [ ] Detección segura de posibles duplicados.
- [ ] Health status de adapters externos.

## Fase 5 — Cooperativas / almazaras

- [ ] Directorio inicial dentro del producto.
- [ ] Fuentes y fecha de actualización.
- [ ] Noticias/avisos públicos cuando sea legal y técnicamente adecuado.
- [ ] Sistema de corrección/verificación.
- [ ] Importación de documentos/exportaciones propias del usuario.
- [ ] Enlaces a accesos oficiales de socio/cosechero sin almacenar credenciales.
- [ ] Contacto con cooperativas/proveedores para futuras integraciones.
- [ ] Primer adapter de proveedor solo tras acuerdo/export verificable.

## Fase 6 — Mágina IA

- [ ] Entrada de labores por lenguaje natural.
- [ ] Extracción asistida de albaranes/tickets.
- [ ] Preguntas sobre datos propios.
- [ ] Resumen inteligente de campaña.
- [ ] Control de costes y límites por usuario.
- [ ] Kill switch de IA.
- [ ] Confirmación humana antes de escrituras críticas.

## Fase 7 — Piloto

- [x] Definir protocolo y tareas de piloto.
- [x] Definir hipótesis H1-H7.
- [x] Definir métricas UX/valor.
- [ ] Reclutar 3-5 agricultores.
- [ ] Preparar cuentas piloto.
- [ ] Probar Android/iOS/navegador.
- [ ] Probar conectividad irregular.
- [ ] Medir entrega manual.
- [ ] Medir labor simple.
- [ ] Medir comprensión finca/parcela/campaña.
- [ ] Probar ticket real anonimizado.
- [ ] Probar rendimiento recibido posteriormente.
- [ ] Recoger fricciones.
- [ ] Generar `docs/pilot/ROUND_1_FINDINGS.md`.
- [ ] Corregir modelo/UI según resultados.
- [ ] Revisar privacidad y recuperación de datos.

Objetivos UX iniciales:
- entrega manual normal < 30 s;
- labor simple < 45 s;
- añadir rendimiento pendiente < 15 s;
- acceso a kilos/rendimiento desde Inicio sin menús profundos;
- cero pérdida silenciosa de operaciones offline.

## Fase 8 — V1 pública

Solo se considerará V1 cuando:
- núcleo agrícola sea estable;
- backup y restore estén probados;
- exportación básica funcione;
- seguridad/autorización estén verificadas;
- atribuciones/licencias estén implementadas;
- exista prueba de campo real;
- se conozca el coste operativo por usuario/campaña.

## V2/V3 potencial

- integración autorizada con proveedores de almazaras/cooperativas;
- CUE comercial/interoperabilidad REAFA;
- automatización documental avanzada;
- expansión fuera de Sierra Mágina;
- colaboración multiusuario/gestor/técnico;
- sensores/IoT solo con caso de uso probado;
- app nativa si la PWA deja de cubrir requisitos reales.
