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


## Radar AEMET V1

Implementado como módulo independiente de la predicción:

- Edge Function: `weather-radar`.
- Fuente oficial: composición nacional de radares de AEMET OpenData.
- Bucket privado: `weather-radar`.
- Captura mínima cada 10 minutos cuando se consulta el radar.
- Deduplicación SHA-256 para no almacenar imágenes idénticas.
- Retención máxima en servidor: 18 fotogramas.
- URLs firmadas de corta duración para Android.
- Caché local Android: hasta 8 imágenes recientes.
- Reproducción manual, pausa y navegación anterior/siguiente.
- El producto se etiqueta expresamente como observación, no como predicción futura.

### Comportamiento sin clave AEMET

Si `AEMET_API_KEY` no está disponible, la función conserva y sirve el historial ya almacenado.
Si el historial está vacío, Android muestra el estado de configuración pendiente sin simular datos meteorológicos.

### Privacidad y seguridad del radar

El bucket no es público. Android no recibe credenciales de Storage ni la clave AEMET.
La Edge Function usa la clave secreta de Supabase exclusivamente en servidor para almacenar y firmar los fotogramas.
