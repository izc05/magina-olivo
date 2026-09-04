# Centro de mando administrativo — V1

## Objetivo

Convertir `/admin` en la pantalla principal de operación de Mágina Olivo. El centro de mando debe responder rápidamente a tres preguntas:

1. ¿Qué requiere atención ahora?
2. ¿Cómo está la actividad básica de la plataforma?
3. ¿A qué módulo debo entrar para actuar?

La gestión publicitaria detallada queda en `/admin/publicidad` y los demás módulos conservan sus rutas independientes.

## Rutas

- `/admin` — centro de mando.
- `/admin/publicidad` — campañas, patrocinios y solicitudes comerciales.
- `/admin/contenido` — noticias, alertas de lluvia y avisos propios.
- `/admin/operaciones` — usuarios, directorio, fuentes y auditoría.
- `/admin/soporte` — contacto, soporte, legal y evidencias del sistema.

## API

`GET /api/v1/admin/command-center`

Requiere administrador global server-side y responde siempre con `Cache-Control: private, no-store`.

La respuesta contiene únicamente información agregada:

- usuarios con explotación;
- explotaciones, parcelas y campañas abiertas;
- solicitudes publicitarias y patrocinios activos/próximos a vencer;
- tickets abiertos y urgentes;
- avisos activos/programados;
- alertas automáticas de lluvia activas;
- noticias destacadas;
- fuentes con error o pendientes de revisión;
- estado agregado de documentos legales;
- evidencias operativas no OK/fallidas;
- número de acciones administrativas de las últimas 24 horas.

No devuelve coordenadas, perímetros, documentos privados, entregas, correos de soporte ni identificadores de explotaciones.

## Reglas de atención

El frontend prioriza:

### Urgente

- tickets de soporte urgentes;
- evidencias operativas marcadas como fallidas.

### Atención

- fuentes con error;
- patrocinios que vencen en 14 días;
- documentos legales sin versión activa;
- evidencias operativas todavía no OK.

### Seguimiento

- tickets abiertos;
- solicitudes publicitarias pendientes;
- fuentes que no constan revisadas durante siete días.

## Seguridad

- `/admin` no sustituye las comprobaciones de autorización de cada módulo.
- El centro de mando es una vista agregada, no una vía alternativa para acceder a datos privados.
- No existe ejecución de backup, restore ni comandos de host desde esta pantalla.
- Los estados de backup/restore proceden exclusivamente de `system_operational_evidence`.
- Las alertas de lluvia mostradas son eventos automáticos propios; no se presentan como avisos oficiales de AEMET.
- La publicidad continúa separada de noticias, mercado, meteorología y datos agronómicos objetivos.

## Decisión de arquitectura

Se evita convertir una sola pantalla en una consola monolítica. `/admin` resume y dirige; cada módulo especializado mantiene sus formularios y flujos de escritura. Esto reduce riesgo operativo y facilita que en el futuro se asignen permisos administrativos más granulares.
