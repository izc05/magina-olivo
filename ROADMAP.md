# Mágina Olivo — Roadmap

## Estado actual

Proyecto en definición funcional. No comenzar la implementación masiva hasta cerrar el modelo de datos, alcance V1 y decisiones técnicas fundamentales.

## Fase 0 — Producto e investigación

- [x] Definir visión general.
- [x] Diferenciar el producto de una app agrícola genérica.
- [x] Establecer que la plataforma debe funcionar sin APIs de cooperativas.
- [x] Establecer IA como capa opcional.
- [x] Inventariar primera fuente institucional de cooperativas/entidades objetivo de Sierra Mágina.
- [x] Confirmar fuentes meteorológicas y cartográficas de alto valor: AEMET + SIGPAC.
- [x] Confirmar fuente fitosanitaria oficial RAIF.
- [x] Investigar marco CUE/SIEX/REAFA y estrategia futura.
- [x] Comparar posicionamiento frente a Agroptima.
- [x] Detectar ecosistema almazara-agricultor AM System / MolturALO.
- [ ] Completar auditoría web/portal/app de las 23 entidades DOP por lotes.
- [ ] Identificar proveedores tecnológicos de portales de socio.
- [ ] Confirmar formatos de exportación disponibles para agricultores en portales prioritarios.
- [ ] Revisar condiciones/licencias concretas de reutilización de cada fuente externa.
- [ ] Revisar requisitos legales de tratamiento de datos y documentos.
- [ ] Definir piloto con agricultores reales.

## Fase 1 — Diseño funcional

- [ ] Cerrar mapa completo de pantallas.
- [ ] Definir navegación móvil.
- [ ] Definir onboarding.
- [ ] Definir modelo de permisos.
- [ ] Cerrar modelo de datos V1.
- [ ] Diseñar flujo de campaña.
- [ ] Diseñar flujo de entrega y rendimiento.
- [ ] Diseñar flujo de labores.
- [ ] Diseñar directorio de cooperativas.
- [ ] Diseñar centro de avisos.
- [ ] Diseñar importación manual/documental sin acoplarla a proveedores.

## Fase 2 — Fundación técnica

- [ ] Crear workspace frontend/backend.
- [ ] Configurar TypeScript y linting.
- [ ] Configurar PWA.
- [ ] Implementar autenticación.
- [ ] Implementar almacenamiento privado.
- [ ] Implementar migraciones/esquema.
- [ ] Configurar entornos development/staging/production.
- [ ] Configurar CI.
- [ ] Añadir backups y estrategia de recuperación.
- [ ] Crear adapters para fuentes externas.

## Fase 3 — MVP agrícola

- [ ] Explotaciones.
- [ ] Fincas.
- [ ] Parcelas.
- [ ] Campañas.
- [ ] Entregas.
- [ ] Rendimientos.
- [ ] Labores.
- [ ] Fotografías/documentos.
- [ ] Dashboard de campaña.
- [ ] Exportación básica.

## Fase 4 — Automatización

- [ ] Meteorología.
- [ ] Reglas de avisos.
- [ ] Recordatorios.
- [ ] Resúmenes de campaña.
- [ ] Recalculo automático de agregados.
- [ ] Centro de ejecuciones y errores.
- [ ] Ingesta periódica RAIF.

## Fase 5 — Cooperativas

- [ ] Directorio inicial.
- [ ] Fuentes y fecha de actualización.
- [ ] Noticias/avisos públicos cuando sea legal y técnicamente adecuado.
- [ ] Sistema de corrección/verificación.
- [ ] Importación de documentos/exportaciones propias del usuario.
- [ ] Contacto con cooperativas/proveedores para futuras integraciones.

## Fase 6 — Mágina IA

- [ ] Entrada de labores por lenguaje natural.
- [ ] Extracción de albaranes/tickets.
- [ ] Preguntas sobre datos propios.
- [ ] Resumen inteligente de campaña.
- [ ] Control de costes y límites.
- [ ] Confirmación humana antes de escrituras críticas.

## Fase 7 — Piloto

- [ ] Preparar cuentas piloto.
- [ ] Probar en Android/iOS/navegador.
- [ ] Probar conectividad irregular.
- [ ] Recoger fricciones de uso reales.
- [ ] Medir tiempo para registrar una entrega/labor.
- [ ] Corregir errores.
- [ ] Revisar privacidad y recuperación de datos.

## Fase 8 — V1 pública

Solo se considerará V1 cuando el núcleo agrícola sea estable, exista backup, exportación básica, seguridad verificada y una prueba de campo real.

## V2/V3 potencial

- integración autorizada con proveedores de almazaras/cooperativas;
- CUE comercial/interoperabilidad REAFA cuando tenga sentido económico y técnico;
- automatización documental avanzada;
- extensión territorial fuera de Sierra Mágina sin perder especialización en olivar.
