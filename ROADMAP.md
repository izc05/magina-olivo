# Mágina Olivo — Roadmap

## Estado actual

Proyecto en definición funcional avanzada. La implementación masiva todavía no comienza: primero cerramos investigación crítica, modelo V1, privacidad y arquitectura de importación.

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
- [x] Detectar proveedores alternativos relevantes como Proyalma/Aicor y Toolagro.
- [x] Definir niveles de madurez digital P0-P3.
- [x] Completar primera clasificación pública 23/23 de entidades DOP, documentando nivel de certeza.
- [x] Confirmar al menos dos casos públicos del ecosistema Almazaras.com: San Sebastián y Oleozumo.
- [ ] Identificar proveedor tecnológico de cada portal prioritario cuando sea públicamente verificable o mediante contacto autorizado.
- [ ] Confirmar formatos de exportación disponibles para agricultores en portales prioritarios.
- [ ] Revisar condiciones/licencias concretas de reutilización de cada fuente externa.
- [x] Definir plan de privacidad/compliance desde diseño.
- [ ] Realizar revisión jurídica específica antes del piloto real.
- [ ] Definir piloto con agricultores reales.
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
- [x] Diseñar importación manual/documental sin acoplarla a proveedores.
- [x] Definir contrato canónico de importación y deduplicación.
- [ ] Cerrar catálogo de tipos de labor/campos mínimos para piloto.
- [ ] Definir wireframes visuales y sistema de diseño.
- [ ] Validar los flujos con 2-5 agricultores antes de congelar UI.

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
- [ ] Implementar staging e idempotencia de importaciones.

## Fase 3 — MVP agrícola

- [ ] Explotaciones.
- [ ] Fincas.
- [ ] Parcelas.
- [ ] Campañas.
- [ ] Entregas.
- [ ] Resultados/rendimientos.
- [ ] Labores.
- [ ] Fotografías/documentos.
- [ ] Dashboard de campaña.
- [ ] Exportación básica.
- [ ] Importación CSV propia/genérica.

## Fase 4 — Automatización

- [ ] Meteorología.
- [ ] Reglas de avisos.
- [ ] Recordatorios.
- [ ] Resúmenes de campaña.
- [ ] Recalculo automático de agregados.
- [ ] Centro de ejecuciones y errores.
- [ ] Ingesta periódica RAIF.
- [ ] Detección de entrega pendiente de rendimiento.
- [ ] Detección segura de posibles duplicados.

## Fase 5 — Cooperativas / almazaras

- [ ] Directorio inicial dentro del producto.
- [ ] Fuentes y fecha de actualización.
- [ ] Noticias/avisos públicos cuando sea legal y técnicamente adecuado.
- [ ] Sistema de corrección/verificación.
- [ ] Importación de documentos/exportaciones propias del usuario.
- [ ] Enlaces a accesos oficiales de socio/cosechero sin almacenar credenciales.
- [ ] Contacto con cooperativas/proveedores para futuras integraciones.

## Fase 6 — Mágina IA

- [ ] Entrada de labores por lenguaje natural.
- [ ] Extracción asistida de albaranes/tickets.
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
- [ ] Medir si el agricultor entiende campaña, finca y parcela sin formación previa.
- [ ] Probar captura de ticket en condiciones reales de campo/almazara.
- [ ] Corregir errores.
- [ ] Revisar privacidad y recuperación de datos.

Objetivos UX iniciales:
- entrega manual normal < 30 s;
- labor simple < 45 s;
- añadir rendimiento pendiente < 15 s;
- acceso a kilos/rendimiento de campaña desde Inicio sin navegar por menús profundos.

## Fase 8 — V1 pública

Solo se considerará V1 cuando el núcleo agrícola sea estable, exista backup, exportación básica, seguridad verificada y una prueba de campo real.

## V2/V3 potencial

- integración autorizada con proveedores de almazaras/cooperativas;
- CUE comercial/interoperabilidad REAFA cuando tenga sentido económico y técnico;
- automatización documental avanzada;
- extensión territorial fuera de Sierra Mágina sin perder especialización en olivar;
- colaboración multiusuario/gestor/técnico cuando el piloto demuestre necesidad;
- integración con sensores/IoT solo si existe un caso de uso y retorno claros.
