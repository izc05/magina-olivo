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


## Avisos de lluvia V1

Los avisos de Mágina Olivo son una ayuda de planificación basada en la probabilidad diaria de precipitación de AEMET. No son avisos oficiales meteorológicos ni sustituyen avisos de Protección Civil.

### Reglas

- Umbral por defecto: 60 %.
- Umbrales configurables: 50, 60, 70 u 80 %.
- Horizonte configurable: 1, 2 o 3 días.
- Nivel `NOTICE`: desde el umbral elegido hasta 79 %.
- Nivel `HIGH`: 80 % o más.
- La selección se hace únicamente con días válidos de la predicción AEMET.
- Si la app solo dispone de caché degradada, no genera una nueva notificación automática.

### Notificaciones Android

- Las notificaciones están desactivadas por defecto.
- En Android 13+ se solicita `POST_NOTIFICATIONS` únicamente cuando el usuario pulsa Activar notificaciones.
- WorkManager revisa la predicción aproximadamente cada 6 horas, con restricción de red.
- Al activar o cambiar umbral/horizonte se puede ejecutar una comprobación inmediata.
- Se deduplica por municipio, fecha, nivel y umbral para evitar repetir el mismo aviso.
- Si ya no existe ningún día que supere el umbral, el estado de deduplicación se limpia para permitir un nuevo aviso futuro.

### Dependencia

WorkManager estable `2.11.2`, verificado contra la documentación oficial de AndroidX en septiembre de 2026.


## Viento y helada V1

Se amplía el motor de avisos con dos tipos nuevos, ambos desactivados por defecto para no empezar a enviar nuevas notificaciones sin una activación explícita del usuario.

### Viento

- Variable: máximo diario previsto por AEMET.
- Umbral inicial recomendado en la interfaz: 40 km/h.
- Opciones configurables: 30, 40, 50 o 60 km/h.
- Nivel interno `HIGH`: 60 km/h o más.
- El aviso se presenta como ayuda de planificación para trabajos expuestos, no como aviso oficial.

### Temperatura mínima / posible helada

- Variable: temperatura mínima diaria prevista por AEMET.
- Umbral inicial de la función: 2 °C.
- Opciones configurables: 0, 1, 2 o 3 °C.
- Nivel interno `HIGH`: 0 °C o menos.
- Entre 1 °C y el umbral elegido se etiqueta como posible riesgo de helada.
- La app advierte expresamente de que una predicción municipal no representa exactamente la temperatura de cada parcela.

### Consentimiento y deduplicación

- Lluvia permanece activada por defecto dentro del motor.
- Viento y helada permanecen desactivados hasta que el usuario los seleccione.
- Las notificaciones Android siguen teniendo un interruptor global independiente.
- Cada tipo mantiene su propia clave de deduplicación, por lo que lluvia, viento y helada pueden coexistir el mismo día sin bloquearse entre sí.
- No se generan nuevas notificaciones automáticas desde una predicción degradada o servida únicamente desde caché local.
