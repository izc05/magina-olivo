# Mágina Olivo — Noticias, alertas y avisos

## Objetivo

La ruta `/admin/contenido` amplía el panel privado con tres responsabilidades separadas:

1. curación de noticias verificadas;
2. supervisión agregada de alertas automáticas de lluvia;
3. avisos propios de Mágina Olivo.

La separación es deliberada. Una comunicación creada por el administrador nunca se etiqueta como aviso oficial de AEMET, RAIF, Protección Civil u otra autoridad.

## Noticias

Las noticias siguen procediendo de fuentes verificadas y el frontend público conserva la política `verified-metadata-only-no-article-copy`.

El administrador puede:

- destacar una noticia para colocarla antes en la lista;
- quitar el destacado;
- ocultar temporalmente una noticia;
- volver a mostrarla.

El panel no sustituye el título por contenido inventado, no copia artículos completos y mantiene el enlace a la fuente original.

`editorial_note` existe únicamente para anotación interna y no se expone por `/api/v1/public/news`.

## Alertas de lluvia

`/api/v1/admin/alerts/overview` ofrece una visión agregada de `weather_alert_events`:

- alertas activas;
- usuarios afectados;
- explotaciones afectadas;
- días próximos implicados;
- municipios;
- probabilidad máxima detectada.

No muestra parcelas, coordenadas, documentos ni entregas privadas.

Estas alertas son contexto calculado desde probabilidad municipal de precipitación y umbral configurado. **No son avisos meteorológicos oficiales de AEMET.**

## Avisos propios

La migración `0023_admin_content_alerts.sql` crea `platform_announcements`.

Estados:

- `draft`;
- `scheduled`;
- `active`;
- `paused`;
- `expired`.

Severidad visual:

- `info`;
- `notice`;
- `warning`;
- `urgent`.

Audiencia V1:

- `all`;
- `authenticated`.

La tabla deja preparado `municipality_slug` para una futura segmentación geográfica controlada. La V1 publica únicamente avisos globales, evitando deducir municipios de explotaciones mediante coincidencias de texto no verificadas.

## Visualización

- `/api/v1/public/announcements`: solo avisos globales para todos.
- `/api/v1/account/announcements`: avisos globales para todos y para usuarios autenticados.
- `PlatformAnnouncements.tsx`: intenta primero la ruta privada; si no existe sesión, usa la pública.
- En todo momento se muestra la etiqueta `Mágina Olivo · Aviso de la plataforma`.

El usuario puede cerrar visualmente un aviso durante la vista actual. El cierre no modifica el estado global del aviso.

## Seguridad y auditoría

Todas las mutaciones de `/api/v1/admin/content/*` requieren `requirePlatformAdmin` en backend.

Se auditan:

- cambios de visibilidad/destacado en noticias;
- creación de avisos;
- cambios de estado o contenido del aviso.

La auditoría no almacena contraseñas, tokens, coordenadas precisas ni contenido agrícola privado.

## Staging

Este bloque se desarrolla fuera del candidato congelado. No debe fusionarse en `main` ni en staging hasta completar los dos gates acumulados y la revisión del piloto.
