# Mágina Olivo Android — Tiempo V1

## Alcance

Implementación meteorológica nativa Android aislada en `feat/android-weather-v1`.

La rama parte de una instantánea de `feat/android-map-catastro-v1`, pero no se rebasa ni mezcla automáticamente mientras Catastro continúe avanzando en paralelo.

## Arquitectura

```
Android (Kotlin / Compose)
  -> Supabase Auth (sesión anónima)
  -> Edge Function weather-forecast
  -> AEMET OpenData
```

La clave `AEMET_API_KEY` permanece exclusivamente en secretos del backend. Nunca se compila dentro de la APK.

## Municipios V1

- Bedmar y Garcíez: `23902`
- Jódar: `23053`
- Jimena: `23052`
- Albanchez de Mágina: `23001`

## Datos mostrados

- Estado del cielo.
- Probabilidad diaria de precipitación.
- Temperatura mínima y máxima.
- Viento máximo.
- UV máximo cuando AEMET lo proporciona.
- Hora/estado de frescura de la predicción.
- Atribución visible a AEMET.

## Resiliencia

- Caché backend de 30 minutos por municipio mientras la instancia Edge permanece caliente.
- Copia local Android de la última respuesta válida.
- Si AEMET o la red fallan, Android muestra la última predicción local y marca el estado como datos de respaldo.
- La respuesta antigua nunca se presenta como una lectura en tiempo real.

## Seguridad

- `SUPABASE_PUBLISHABLE_KEY` puede residir en el cliente móvil.
- `AEMET_API_KEY` no debe residir en Android ni en Git.
- `weather-forecast` exige JWT válido de Supabase.
- Solo se aceptan municipios incluidos explícitamente.
- La segunda URL devuelta por AEMET se valida para permitir únicamente HTTPS en `opendata.aemet.es`.

## Siguiente bloque meteorológico

Radar V1 debe mantenerse separado de la predicción:
- producto nacional de radar AEMET;
- capturas periódicas en servidor;
- historial corto de fotogramas;
- reproducción manual en Android;
- sin inferir ETA de lluvia, intensidad agronómica ni decisiones de tratamiento.
