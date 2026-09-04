# Radar meteorológico animado V1

## Objetivo

Añadir a **Mágina · Tiempo** un reproductor ligero del movimiento reciente de la precipitación usando la composición nacional de radar de **AEMET OpenData**.

Esta función muestra **radar de precipitación**. No debe presentarse como una capa de nubosidad por satélite, aviso oficial de fenómenos adversos ni diagnóstico a nivel de parcela.

## Flujo

1. El worker consulta el producto nacional de radar de AEMET desde servidor.
2. Descarga la imagen únicamente desde `opendata.aemet.es` y valida tipo y tamaño.
3. Calcula SHA-256 para evitar guardar fotogramas idénticos.
4. Persiste como máximo los 18 fotogramas más recientes en `weather_radar_frames`.
5. La API pública expone solo metadatos y las imágenes del historial corto.
6. La pantalla Tiempo muestra el último fotograma y permite reproducir, pausar o recorrer manualmente la secuencia.

## Cadencia y retención

- Variable: `WEATHER_RADAR_CAPTURE_MINUTES`.
- Valor por defecto: `10` minutos.
- Rango permitido: `5–60` minutos.
- Retención V1: `18` fotogramas distintos como máximo.
- Con la cadencia por defecto, el historial puede representar aproximadamente las últimas 3 horas cuando el producto cambia en cada captura.

El reproductor no se inicia automáticamente. El usuario debe pulsar **Reproducir**. La pantalla vuelve a consultar la lista de fotogramas cada 5 minutos.

## Primer arranque

En una instalación nueva puede no haber historial todavía. Con cero fotogramas se muestra un estado informativo; con uno se muestra la última imagen; la reproducción se habilita cuando existen al menos dos fotogramas distintos.

## Endpoints

- `GET /api/v1/public/weather/radar/frames`
- `GET /api/v1/public/weather/radar/frames/:id/image`

La clave `AEMET_API_KEY` permanece exclusivamente en API/worker y nunca se entrega al navegador.

## Comportamiento ante fallos

- Un fallo puntual de AEMET no borra los fotogramas ya almacenados.
- El worker programa la siguiente captura incluso cuando una consulta falla.
- Una incidencia externa no debe detener el proceso persistente del worker.
- No se interpreta la ausencia de una imagen nueva como ausencia de lluvia.

## Límites V1

- No hay capa de nubes por satélite.
- No hay nowcasting minuto a minuto.
- No se proyecta el radar sobre el polígono exacto de la parcela.
- No se infiere intensidad de lluvia agronómica ni decisión de tratamiento.
- No sustituye los avisos oficiales de AEMET.

Una futura V2 puede incorporar una capa satelital de nubosidad separada si se dispone de una fuente oficial, estable y reutilizable con condiciones compatibles con el proyecto.
