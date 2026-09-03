# Alarma automática de lluvia

## Objetivo

La alarma de lluvia de Mágina Olivo avisa al usuario cuando la predicción municipal diaria de AEMET supera el umbral de probabilidad configurado en **Mi Cuenta**.

Esta función es un apoyo para la planificación agrícola. No es un aviso oficial de AEMET, no sustituye las alertas de Protección Civil y no debe interpretarse como un diagnóstico de parcela.

## Alcance V1

- Fuente: **AEMET OpenData**.
- Variable: probabilidad diaria de precipitación (%).
- Horizonte evaluado: próximos **2 días** disponibles.
- Umbral por usuario: `weatherRainProbabilityPercentThreshold` (60 % por defecto).
- Activación general: `notifyWeather`.
- Localización: municipio de la primera explotación activa del usuario, resuelto contra `public_municipalities` y sus alias.
- Evaluación: servidor/worker, independiente de que el usuario tenga la aplicación abierta.
- Persistencia: los eventos se guardan en `weather_alert_events` como `active` o `resolved`.
- Lectura privada: `GET /api/v1/account/rain-alerts`, filtrada por el usuario autenticado.
- Presentación: `PilotAlerts` prioriza las alarmas de lluvia persistidas y mantiene helada/viento como avisos meteorológicos contextuales.

## Flujo

1. La migración `0017_rain_alert_events.sql` crea únicamente la tabla e índices de eventos; no ejecuta trabajos externos durante una migración.
2. Al arrancar un worker persistente, éste garantiza que exista un primer trabajo `weather.rain.scan`. El arranque usa un advisory lock de PostgreSQL para evitar que varios workers creen simultáneamente el mismo barrido. Los procesos `RUN_ONCE=1` usados en gates/pruebas no autoencolan este trabajo.
3. El worker obtiene los usuarios con avisos meteorológicos activos y una explotación activa con municipio reconocido.
4. El worker consulta AEMET una sola vez por municipio dentro de cada barrido y reutiliza esa respuesta para todos los usuarios de la misma zona.
5. La probabilidad diaria se interpreta igual que en el adaptador público de Tiempo: se usa el periodo `00-24` cuando existe y, si no, el máximo de los subperiodos válidos.
6. Si la probabilidad de alguno de los dos primeros días es mayor o igual al umbral del usuario, se crea o actualiza un evento de alarma.
7. Si una predicción válida deja de superar el umbral, el evento anterior se marca como `resolved`.
8. Si AEMET falla para un municipio, no se eliminan alarmas activas basándose en una ausencia de datos.
9. Cada trabajo programa el siguiente barrido según `RAIN_ALERT_SCAN_MINUTES`.

## Configuración

Variables de entorno necesarias:

- `AEMET_API_KEY`: obligatoria para consultar AEMET desde el worker y desde la API meteorológica.
- `RAIN_ALERT_SCAN_MINUTES`: cadencia del barrido automático. Valor por defecto: `30`. Rango válido: `5..1440` minutos.

La clave de AEMET permanece siempre en servidor. Nunca debe exponerse en variables `VITE_*` ni enviarse al navegador.

## Deduplicación y trazabilidad

La combinación `(user_id, holding_id, kind, forecast_date)` es única. Una nueva lectura para el mismo día actualiza probabilidad, umbral, proveedor y `last_detected_at` sin crear duplicados.

Cada evento conserva:

- usuario y explotación,
- municipio,
- fecha pronosticada,
- probabilidad observada,
- umbral aplicado,
- proveedor,
- fecha de elaboración del proveedor,
- primera y última detección,
- estado y fecha de resolución.

## Seguridad y privacidad

- El endpoint de cuenta exige sesión autenticada.
- La consulta privada filtra explícitamente por `user_id` de la sesión.
- El navegador no recibe la API key de AEMET.
- Una avería del proveedor meteorológico no bloquea los datos agrícolas privados.

## Limitaciones V1

La V1 **no** incluye todavía:

- precipitación acumulada en mm,
- radar/nowcasting minuto a minuto,
- sensores físicos de lluvia o humedad,
- geolocalización por polígono exacto de parcela,
- avisos oficiales amarillo/naranja/rojo de AEMET,
- push, SMS o correo fuera de la aplicación,
- reglas agronómicas compuestas lluvia + tratamiento + estado de suelo.

Estas capacidades pueden añadirse después sin sustituir el motor V1: la tabla de eventos y el worker permiten incorporar nuevos tipos de alerta y nuevos proveedores de forma incremental.

## Pruebas

Las reglas deterministas de selección de días y umbral están cubiertas en `apps/worker/src/rain-alert-rules.test.ts`.

Antes de integrar cualquier cambio deben pasar los checks habituales del repositorio (typecheck, tests y gates de CI) y validarse la migración en un entorno de staging con `AEMET_API_KEY` configurada.
