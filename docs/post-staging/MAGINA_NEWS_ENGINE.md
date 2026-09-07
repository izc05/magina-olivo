# Mágina News Engine — arquitectura post-staging

> Estado: **DISEÑO / POST-STAGING**. No forma parte del candidato `staging/candidate-v11-2026-09-05` y no debe fusionarse en la línea de aceptación mientras el P0 de staging siga abierto.

## 1. Objetivo

Crear un módulo editorial para Mágina Olivo capaz de:

- descubrir noticias, eventos, avisos y novedades desde fuentes públicas;
- detectar contenido nuevo y duplicados;
- clasificar por municipio, categoría, fecha e importancia;
- preparar contenido para la app;
- permitir revisión humana;
- activar publicación automática solo para fuentes y reglas explícitamente autorizadas;
- generar versiones derivadas para Home, calendario y notificaciones;
- incorporar IA de forma opcional, intercambiable y con control de costes.

La IA **no será la fuente de verdad**. La fuente será siempre el organismo, feed, web o API original. Mágina Olivo conservará la URL, fecha de consulta y trazabilidad de publicación.

## 2. Principios

1. **Primero sin IA**: la ingesta, deduplicación y panel de revisión deben poder funcionar sin OpenAI.
2. **Human-in-the-loop por defecto**: al inicio todo entra como `pending_review`.
3. **Autopublicación por allowlist**: solo fuentes oficiales y reglas validadas.
4. **No copiar artículos completos**: guardar metadatos, extractos permitidos y crear redacción propia enlazando a la fuente.
5. **Proveedor IA desacoplado**: OpenAI como opción principal, con posibilidad de Ollama/local u otro proveedor compatible.
6. **Kill switch**: poder desactivar IA y autopublicación sin desplegar código.
7. **Coste acotado**: no enviar a IA contenido duplicado, irrelevante o descartado por reglas deterministas.
8. **V11 inmutable**: este trabajo queda en rama post-staging hasta cerrar la aceptación real.

## 3. Encaje con la arquitectura actual

El repositorio ya dispone de `apps/web`, `apps/api` y `apps/worker`. El motor editorial debe vivir principalmente en `apps/worker` y exponer el resultado mediante la API existente.

```text
Fuentes oficiales / RSS / páginas públicas
                │
                ▼
        apps/worker/news-engine
                │
      ┌─────────┴─────────┐
      │ normalización     │
      │ deduplicación     │
      │ reglas locales    │
      │ clasificación     │
      └─────────┬─────────┘
                │
        ¿requiere IA?
          │           │
         no          sí
          │           ▼
          │     AI Provider
          │    OpenAI / local
          │           │
          └─────┬─────┘
                ▼
            PostgreSQL
                │
                ▼
             apps/api
                │
        ┌───────┼────────┐
        ▼       ▼        ▼
      Admin   Noticias  Eventos
                         │
                         ▼
                      Web Push
```

## 4. Fuentes objetivo

### Prioridad A — oficiales

- AEMET.
- RAIF / Junta de Andalucía.
- BOJA.
- Junta de Andalucía: agricultura, ayudas y PAC.
- Diputación Provincial de Jaén.
- Ayuntamientos de Sierra Mágina.
- organismos y portales oficiales relacionados con agricultura y medio ambiente.

### Prioridad B — entidades locales

- cooperativas y almazaras;
- DOP Sierra Mágina;
- asociaciones sectoriales;
- agenda cultural/institucional municipal.

### Prioridad C — otras fuentes

Solo mediante revisión manual hasta disponer de política editorial y derechos de uso claros.

## 5. Categorías editoriales

- `olivar`
- `meteorologia`
- `plagas_raif`
- `ayudas_pac`
- `eventos`
- `pueblos`
- `cooperativas`
- `aceite_mercado`
- `medio_ambiente`
- `agricultura`
- `avisos`
- `actualidad`

## 6. Pipeline

### Paso 1 — descubrimiento

Cada adapter obtiene elementos desde RSS/Atom, API o página autorizada y entrega un formato normalizado.

### Paso 2 — normalización

Campos mínimos:

```ts
interface DiscoveredItem {
  sourceId: string;
  sourceUrl: string;
  canonicalUrl: string;
  externalId?: string;
  title: string;
  summary?: string;
  bodyText?: string;
  publishedAt?: string;
  discoveredAt: string;
  rawHash: string;
}
```

### Paso 3 — deduplicación

Orden recomendado:

1. `sourceId + externalId` cuando exista;
2. URL canónica;
3. hash normalizado;
4. similitud de título/fecha solo como segunda defensa.

La IA no debe ser necesaria para la deduplicación primaria.

### Paso 4 — filtro determinista

Antes de usar IA:

- fecha válida;
- ámbito geográfico relevante;
- palabras/temas bloqueados;
- tipo de fuente;
- tamaño máximo del contenido;
- estado previo del mismo elemento.

### Paso 5 — enriquecimiento opcional con IA

La IA puede devolver JSON estructurado con:

- título editorial;
- entradilla;
- resumen;
- categoría;
- municipio(s);
- fecha/hora del evento;
- nivel de relevancia;
- etiquetas;
- texto de notificación;
- explicación breve de por qué es relevante;
- bandera `needs_human_review`.

### Paso 6 — moderación

Estados propuestos:

- `discovered`
- `rejected_by_rule`
- `pending_ai`
- `pending_review`
- `approved`
- `scheduled`
- `published`
- `discarded`
- `failed`
- `updated`

### Paso 7 — publicación

La publicación debe ser idempotente. El mismo elemento no puede crear dos noticias por reintentos del worker.

## 7. Modelo de datos propuesto

### `content_sources`

- id
- name
- base_url
- feed_url / adapter_type
- trust_level
- autopublish_enabled
- ai_enabled
- polling_interval_minutes
- last_success_at
- last_error_at
- enabled

### `content_ingest_items`

- id
- source_id
- external_id
- canonical_url
- title_original
- excerpt_original
- published_at
- discovered_at
- raw_hash
- status
- attempts
- last_error

Restricciones recomendadas:

- unique `(source_id, external_id)` cuando exista;
- unique `canonical_url` cuando sea estable;
- índice por `raw_hash`.

### `editorial_items`

- id
- ingest_item_id
- content_type (`news`, `event`, `alert`, `update`)
- title
- summary
- body
- category
- municipality
- starts_at
- ends_at
- relevance_score
- status
- source_attribution
- source_url
- ai_provider
- ai_model
- ai_cost_units
- approved_by
- approved_at
- published_at

### `editorial_runs`

- id
- source_id
- started_at
- finished_at
- discovered_count
- duplicate_count
- rejected_count
- ai_count
- published_count
- error_count
- status

## 8. API propuesta

### Administración

- `GET /api/v1/admin/editorial/items`
- `GET /api/v1/admin/editorial/items/:id`
- `POST /api/v1/admin/editorial/items/:id/approve`
- `POST /api/v1/admin/editorial/items/:id/discard`
- `POST /api/v1/admin/editorial/items/:id/regenerate`
- `POST /api/v1/admin/editorial/items/:id/publish`
- `GET /api/v1/admin/editorial/sources`
- `PATCH /api/v1/admin/editorial/sources/:id`
- `GET /api/v1/admin/editorial/runs`

### Público

Reutilizar los contratos públicos existentes de noticias/eventos cuando sea posible. No crear una segunda API pública paralela si ya existe una ruta equivalente.

## 9. Proveedor IA

Definir una interfaz interna y no acoplar el worker directamente a OpenAI:

```ts
interface EditorialAiProvider {
  enrich(input: EditorialAiInput): Promise<EditorialAiOutput>;
}
```

Implementaciones futuras:

- `OpenAiEditorialProvider`
- `OllamaEditorialProvider`
- `NoopEditorialProvider`

Variables previstas, no activas todavía:

```dotenv
EDITORIAL_AI_ENABLED=false
EDITORIAL_AUTOPUBLISH_ENABLED=false
EDITORIAL_AI_PROVIDER=none
OPENAI_API_KEY=
OPENAI_EDITORIAL_MODEL=
```

**Nunca** incluir la API key en frontend, GitHub Pages, logs o respuestas HTTP.

## 10. Estrategia de coste

La versión inicial debe funcionar con coste IA **0**.

Cuando se active IA:

1. deduplicar antes de llamar al modelo;
2. limitar tamaño del texto enviado;
3. usar modelo económico por defecto;
4. reservar modelos superiores para contenido complejo;
5. registrar uso por ejecución;
6. definir límites diarios/mensuales;
7. desactivar automáticamente IA si se supera el presupuesto configurado;
8. mantener siempre disponible el modo manual sin IA.

## 11. Reglas de autopublicación

Inicio recomendado:

```text
Cualquier fuente -> revisión manual
```

Después de pruebas:

```text
AEMET oficial + aviso validado              -> posible auto
RAIF oficial + alerta fitosanitaria relevante -> posible auto
Evento municipal oficial con fecha clara    -> posible auto
Ayuda/PAC/BOJA                               -> revisión humana
Fuente no oficial                           -> revisión humana
Contenido ambiguo                           -> revisión humana
```

La autopublicación no debe depender solo de una puntuación del LLM.

## 12. Panel de administración

Ruta conceptual:

```text
Administración
└── Contenido
    ├── Pendientes
    ├── Programados
    ├── Publicados
    ├── Descartados
    ├── Fuentes
    └── Ejecuciones
```

Acciones por elemento:

- ver original;
- comparar original / versión editorial;
- editar;
- aprobar;
- programar;
- publicar;
- descartar;
- regenerar con IA;
- ver trazabilidad.

## 13. Repositorios open-source a evaluar

No se copia código en esta fase. Se documentan como referencias técnicas para análisis por Codex:

- `qianqiuqiu/news-aggregator`
- `huawolf/news-agent`
- `eschnou/morningdeck`
- `starkSV/MuckScraper-v2`

Antes de reutilizar código:

- verificar licencia exacta y compatibilidad;
- revisar actividad/mantenimiento;
- auditar dependencias;
- comprobar SSRF, scraping inseguro y manejo de secretos;
- evitar incorporar UIs o servicios completos si solo necesitamos patrones concretos;
- documentar cualquier código derivado y cumplir atribución/licencia.

Preferencia arquitectónica: **extraer ideas/patrones y construir el módulo dentro del worker existente**, no desplegar otra plataforma completa salvo que una prueba técnica demuestre una ventaja clara.

## 14. Fases de implantación

### N0 — Documentación

- [x] arquitectura;
- [x] pipeline;
- [x] modelo de datos candidato;
- [x] API candidata;
- [x] abstracción IA;
- [x] reglas de seguridad/coste;
- [ ] revisión de repositorios open-source.

### N1 — Ingesta sin IA

- [ ] framework de adapters;
- [ ] primer feed RSS de prueba;
- [ ] deduplicación;
- [ ] persistencia;
- [ ] ejecución programada;
- [ ] panel `pending_review`;
- [ ] publicación manual.

### N2 — Fuentes oficiales

- [ ] RAIF;
- [ ] AEMET;
- [ ] Junta/BOJA;
- [ ] primeros ayuntamientos;
- [ ] cooperativas seleccionadas.

### N3 — IA opcional

- [ ] interfaz de provider;
- [ ] OpenAI provider;
- [ ] salida JSON validada;
- [ ] límites y telemetría;
- [ ] botón `Generar con IA`;
- [ ] pruebas de alucinación/atribución.

### N4 — Automatización controlada

- [ ] allowlist de autopublicación;
- [ ] programación;
- [ ] actualizaciones de elementos existentes;
- [ ] generación de push;
- [ ] alertas de fallo de adapters;
- [ ] métricas de precisión editorial.

## 15. Criterios de aceptación

No considerar el News Engine listo hasta demostrar:

- cero publicación duplicada en reintentos;
- toda publicación conserva fuente y URL original;
- una fuente caída no bloquea las demás;
- el worker funciona con IA desactivada;
- ninguna clave aparece en frontend/logs;
- panel permite aprobar/editar/descartar;
- autopublicación puede desactivarse globalmente;
- IA puede desactivarse globalmente;
- contenido ambiguo va a revisión;
- restore de base de datos conserva trazabilidad editorial;
- consumo de memoria compatible con el servidor de staging de 8 GB.

## 16. Decisión actual

**No activar ni desplegar todavía.**

La rama de este documento es una línea post-staging. El candidato V11 y `feat/integration-v2-mvp-v1` deben permanecer en el SHA de aceptación mientras el P0 de staging no esté cerrado. La implementación del News Engine se retomará después del PASS del staging real.