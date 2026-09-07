# Mágina Content Center — diseño post-staging

> Estado: **DISEÑO / POST-STAGING**. Este documento evoluciona el concepto inicial de `Mágina News Engine` hacia un sistema común de contenidos. No forma parte del candidato `staging/candidate-v11-2026-09-05` y **NO DEBE fusionarse mientras el P0 de staging siga abierto**.

## 1. Decisión de producto

Mágina Olivo tendrá un **Content Center** en Administración para gestionar desde un único lugar:

- noticias;
- eventos y agenda;
- ayudas y subvenciones;
- avisos agrícolas / RAIF;
- mercado del aceite;
- comunicados municipales;
- novedades de cooperativas;
- otros contenidos editoriales futuros.

La **publicidad comparte el panel Admin, pero mantiene dominio y tablas propios**. Una noticia nunca se convierte en anuncio ni una IA puede crear campañas publicitarias no autorizadas.

El sistema debe admitir cuatro entradas:

1. **Manual**: un administrador crea o edita una ficha.
2. **Importar URL**: el administrador pega un enlace y Mágina prepara un borrador.
3. **ChatGPT / Work asistido**: una investigación entrega URLs o fichas candidatas.
4. **Codex / automatización**: una tarea programada puede descubrir candidatos y enviarlos a la API interna, inicialmente siempre a revisión.

La app nunca dependerá de que Codex modifique React, haga commits o pulse botones para publicar una noticia. El contenido vive en PostgreSQL y se publica mediante una API estable.

## 2. Objetivo de escalabilidad

El mismo flujo debe servir con 5 contenidos por semana o con cientos de candidatos diarios sin rehacer arquitectura.

```text
Internet / fuentes autorizadas
          │
   ┌──────┼────────────────────┐
   │      │                    │
 Manual  Import URL      ChatGPT / Codex
   │      │                    │
   └──────┴──────────┬─────────┘
                    ▼
             Content Candidate
                    │
          normalizar / validar
                    │
        deduplicar / clasificar
                    │
             aplicar política
                    │
        ┌───────────┴───────────┐
        ▼                       ▼
 pending_review            auto-approved
        │                       │
        └───────────┬───────────┘
                    ▼
                 apps/api
                    │
                PostgreSQL
                    │
      ┌─────────────┼─────────────┐
      ▼             ▼             ▼
  Noticias        Agenda        Ayudas/avisos
                    │
                    ▼
               Mágina Olivo
```

## 3. Flujo A — publicación manual

Ruta conceptual:

```text
Admin > Contenido > Nuevo
```

Campos mínimos:

- tipo de contenido;
- titular;
- resumen propio;
- cuerpo opcional;
- categoría;
- fuente;
- URL original;
- fecha de la fuente;
- municipio / ámbito;
- fecha y lugar si es evento;
- imagen opcional;
- autor/licencia/origen de la imagen;
- estado: borrador / programado / publicado.

Esto debe funcionar incluso con toda IA desactivada.

## 4. Flujo B — Importar desde URL

El administrador pega una URL en:

```text
Admin > Contenido > Importar enlace
```

La importación **no publica directamente**. Devuelve una propuesta editable:

- título detectado;
- resumen/extracto permitido;
- fuente;
- URL canónica;
- fecha;
- tipo de contenido sugerido;
- municipio/ámbito sugerido;
- fecha/hora/lugar si parece un evento;
- imagen encontrada solo como candidata;
- metadatos de imagen y derechos cuando puedan determinarse;
- score de relevancia;
- advertencias de verificación.

Después:

```text
[Ver fuente] [Editar] [Publicar] [Descartar]
```

### Seguridad de Import URL

La API no debe convertirse en un proxy SSRF. Requisitos:

- solo `http:` / `https:`;
- bloquear localhost, loopback, redes privadas y metadata cloud;
- límite estricto de tamaño y tiempo;
- redirects limitados;
- Content-Type permitido;
- sanitización de HTML;
- nunca ejecutar JavaScript remoto en API/worker;
- registrar URL original y URL final;
- allowlist opcional para fuentes automáticas.

## 5. Flujo C — ChatGPT / Work

ChatGPT/Work puede investigar fuentes públicas y preparar una selección de candidatos. El contrato de entrada no es texto libre: debe ser una ficha estructurada.

Ejemplo conceptual:

```json
{
  "type": "event",
  "title": "Jornada técnica sobre poda del olivar",
  "summary": "Resumen editorial propio...",
  "sourceName": "Ayuntamiento de ...",
  "sourceUrl": "https://...",
  "publishedAt": "2026-09-07T08:00:00+02:00",
  "startsAt": "2026-09-20T10:00:00+02:00",
  "municipalities": ["..."],
  "relevanceScore": 94,
  "origin": "chatgpt"
}
```

El backend vuelve a validar URL, fuente, fechas, deduplicación y permisos. **Nunca confía en el cliente porque diga que la ficha ya está verificada.**

## 6. Flujo D — Codex cada 48 horas

Codex puede actuar como investigador/supervisor, pero el contrato de producción debe ser el mismo.

Frecuencia inicial recomendada:

```text
cada 48 horas
```

Trabajo conceptual:

1. revisar fuentes autorizadas;
2. localizar contenido nuevo;
3. generar candidatos estructurados;
4. verificar URL, fecha y atribución;
5. enviar candidatos a la API interna;
6. recibir resumen de aceptados/duplicados/rechazados;
7. dejar trazabilidad de la ejecución.

La primera fase debe terminar siempre en `pending_review`. La autopublicación se habilita después por fuente + reglas deterministas.

## 7. Tipos editoriales

Tipos iniciales:

- `news`
- `event`
- `grant`
- `agri_alert`
- `market_update`
- `municipal_notice`
- `cooperative_update`

No incluir `advertisement` en esta unión. Publicidad es un dominio separado.

## 8. Estados

```text
discovered
imported
pending_review
approved
scheduled
published
archived
discarded
rejected_by_rule
failed
```

Transiciones importantes:

- ningún candidato automático salta validación;
- `published` debe ser idempotente;
- eventos pasan a `archived` automáticamente después de su fecha/ventana;
- una actualización de fuente puede crear una revisión del contenido, no una segunda noticia duplicada.

## 9. Registro de fuentes

Cada fuente debe tener:

- `id`;
- nombre;
- dominio/base URL;
- tipo de adapter (`rss`, `api`, `html`, `manual`);
- nivel de confianza;
- categorías admitidas;
- municipios/ámbito;
- enabled;
- allow_import;
- allow_automatic_discovery;
- allow_autopublish;
- requires_human_review;
- política de imágenes;
- última ejecución correcta / error.

Niveles sugeridos:

- `official`: administración u organismo oficial;
- `trusted`: entidad/medio validado por Mágina;
- `reviewed`: fuente aceptada, siempre con revisión;
- `unknown`: nunca auto-publicable.

## 10. Política de publicación

### Fase inicial

```text
TODOS LOS CANDIDATOS -> pending_review
```

### Fase madura

La autopublicación requiere simultáneamente:

- `CONTENT_AUTOPUBLISH_ENABLED=true`;
- fuente con `allow_autopublish=true`;
- fuente no `unknown`;
- score mínimo;
- sin advertencias de verificación;
- URL válida;
- sin duplicado;
- tipo permitido para autopublicación;
- imagen con derechos compatibles o fallback propio.

El score de IA **nunca es suficiente por sí solo**.

## 11. Imágenes y derechos

Cada medio debe registrar, cuando proceda:

- URL original;
- autor;
- proveedor/fuente;
- licencia;
- estado de derechos;
- texto alternativo;
- si se aloja localmente o solo se referencia.

Estados propuestos:

- `owned`
- `licensed`
- `official_reusable`
- `external_reference_only`
- `unknown`
- `blocked`

Regla inicial:

```text
unknown / blocked -> NO copiar imagen a Mágina
```

Si una noticia no tiene imagen utilizable, Mágina usa un **fallback visual propio por categoría**. Esto mantiene identidad gráfica y reduce riesgo de derechos de autor.

## 12. Publicidad — Advertising Center separado

Ruta conceptual:

```text
Admin
├── Contenido
└── Publicidad
```

Publicidad maneja:

- anunciantes;
- campañas;
- creatividades;
- fechas de inicio/fin;
- targeting geográfico/categoría;
- estado de aprobación;
- impresiones/clics;
- presupuesto/plan cuando aplique.

La activación/caducidad por fecha la hace el worker, no Codex.

Codex/IA puede:

- detectar campañas con errores;
- resumir estadísticas;
- sugerir borradores;
- detectar creatividades faltantes;
- preparar leads comerciales.

Codex/IA no puede:

- inventar un anunciante;
- publicar una campaña sin aprobación;
- modificar precio/contrato sin flujo autorizado.

## 13. Modelo de datos candidato

### `content_sources`

Configuración y confianza de las fuentes.

### `content_candidates`

Entrada temporal de manual/importación/ChatGPT/Codex/adapters.

Campos principales:

- id;
- origin;
- source_id;
- canonical_url;
- external_id;
- type;
- title_original;
- excerpt_original;
- published_at;
- discovered_at;
- fingerprint;
- validation_warnings;
- status.

### `content_items`

Contenido editorial que ve la app.

- id;
- candidate_id;
- type;
- title;
- summary;
- body;
- category;
- municipalities;
- starts_at;
- ends_at;
- venue;
- relevance_score;
- source_name;
- source_url;
- status;
- approved_by;
- approved_at;
- scheduled_at;
- published_at;
- archived_at.

### `content_media`

Metadatos, licencia y fallbacks de imagen.

### `content_runs`

Auditoría de cada ejecución manual, worker, ChatGPT o Codex.

### Publicidad

Mantener tablas separadas, por ejemplo:

- `advertisers`
- `ad_campaigns`
- `ad_creatives`
- `ad_delivery_events`

## 14. API candidata

### Admin humano

- `POST /api/v1/admin/content`
- `PATCH /api/v1/admin/content/:id`
- `POST /api/v1/admin/content/import-url`
- `POST /api/v1/admin/content/:id/approve`
- `POST /api/v1/admin/content/:id/schedule`
- `POST /api/v1/admin/content/:id/publish`
- `POST /api/v1/admin/content/:id/discard`
- `GET /api/v1/admin/content`
- `GET /api/v1/admin/content/sources`
- `GET /api/v1/admin/content/runs`

### Entrada automatizada

- `POST /api/v1/internal/content/candidates`
- `POST /api/v1/internal/content/runs`

La API interna debe usar credencial de servicio dedicada, scopes mínimos, rate limit e idempotency key. Codex no recibe acceso directo a PostgreSQL.

### Público

Reutilizar rutas públicas existentes de noticias/eventos cuando sea posible. No crear dos APIs públicas que representen lo mismo.

## 15. Admin UX

```text
ADMINISTRACIÓN
│
├── Contenido
│   ├── Pendientes
│   ├── Programados
│   ├── Publicados
│   ├── Archivados
│   ├── Fuentes
│   └── Ejecuciones
│
├── Publicidad
│   ├── Anunciantes
│   ├── Campañas
│   └── Estadísticas
│
└── Automatización
    ├── Última ejecución
    ├── Próxima ejecución
    ├── Encontrados
    ├── Duplicados
    ├── Publicados
    ├── Pendientes
    ├── Errores
    ├── Ejecutar ahora
    └── Pausar
```

Cada candidato muestra:

- fuente y confianza;
- enlace `Ver original`;
- título/resumen propuestos;
- imagen y estado de derechos;
- score y advertencias;
- acciones `Editar`, `Publicar`, `Programar`, `Descartar`.

## 16. Deduplicación

Orden recomendado:

1. `source_id + external_id`;
2. URL canónica;
3. fingerprint normalizado;
4. título + fecha + fuente como defensa secundaria;
5. similitud semántica opcional solo para casos ambiguos.

La IA no debe ser el primer mecanismo de deduplicación.

## 17. Observabilidad

Cada ejecución registra:

- origen;
- duración;
- URLs consultadas;
- encontrados;
- duplicados;
- rechazados;
- enviados a revisión;
- auto-publicados;
- errores;
- consumo IA cuando aplique.

El panel Admin mostrará estos datos sin exponer secretos.

## 18. División de responsabilidades

### ChatGPT / Work

- investigar;
- comparar fuentes;
- preparar candidatos;
- localizar eventos/ayudas/noticias.

### Codex

- construir y mantener el sistema;
- opcionalmente ejecutar investigaciones programadas;
- enviar candidatos por API;
- revisar fallos, tests y telemetría;
- preparar PRs para mejoras de código.

### Worker Mágina

- scheduling determinista;
- adapters RSS/API;
- caducidad de eventos;
- publicación programada;
- activación/caducidad de publicidad;
- reintentos y trabajos idempotentes.

### API

- autorización;
- validación;
- deduplicación final;
- persistencia;
- auditoría;
- publicación.

## 19. Fases

### C0 — Diseño

- [x] arquitectura del Content Center;
- [x] separación publicidad/contenido;
- [x] contratos de candidato, fuente y media;
- [x] flujo Import URL;
- [x] flujo ChatGPT/Codex;
- [x] política de autopublicación;
- [x] seguridad y derechos de imagen.

### C1 — Admin manual

- [ ] tablas/migraciones;
- [ ] CRUD Admin;
- [ ] borrador/publicación;
- [ ] agenda/eventos;
- [ ] imágenes propias/fallbacks;
- [ ] auditoría.

### C2 — Import URL

- [ ] fetch seguro;
- [ ] parser metadata;
- [ ] propuesta de borrador;
- [ ] SSRF tests;
- [ ] deduplicación;
- [ ] ver original.

### C3 — Fuentes automáticas

- [ ] RSS/API adapters;
- [ ] fuentes oficiales iniciales;
- [ ] worker programado;
- [ ] ejecución cada 48 h configurable;
- [ ] panel de runs.

### C4 — IA opcional

- [ ] clasificación;
- [ ] resumen propio;
- [ ] extracción de eventos;
- [ ] relevancia;
- [ ] JSON estructurado;
- [ ] límites de coste;
- [ ] trazabilidad de modelo/uso.

### C5 — Codex / Work automation

- [ ] service credential dedicada;
- [ ] endpoint interno de candidatos;
- [ ] idempotency keys;
- [ ] automatización de investigación;
- [ ] revisión de calidad;
- [ ] autopublicación solo tras evidencia real.

## 20. Criterios de aceptación

No considerar el Content Center listo hasta demostrar:

- publicación manual sin IA;
- importación URL no permite SSRF;
- reintentos no duplican publicaciones;
- todos los contenidos conservan fuente y URL;
- eventos se archivan correctamente;
- imágenes sin derechos claros no se copian;
- fallbacks visuales funcionan;
- Codex/ChatGPT no tienen acceso directo a la base de datos;
- credenciales internas tienen scope mínimo;
- todo candidato automático queda trazado;
- autopublicación puede apagarse globalmente;
- una fuente puede deshabilitarse sin despliegue;
- publicidad funciona aunque Content Center esté pausado;
- restaurar backup conserva contenido, fuente y auditoría.

## 21. Regla operativa actual

**No activar nada todavía.**

Este diseño se desarrolla únicamente en la rama post-staging. No añadir scheduler activo, secretos, migraciones productivas, rutas registradas en `apps/api`, dependencias externas ni cambios de `docker-compose` mientras siga abierto el P0 de aceptación de V11.

Cuando staging esté en PASS, C1 será el primer incremento implementable.