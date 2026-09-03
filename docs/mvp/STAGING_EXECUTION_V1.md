# Mágina Olivo — Staging Execution V1

Estado: **procedimiento operativo preparado; requiere recursos externos reales**.

Rama objetivo: `feat/integration-v2-mvp-v1`.

Este documento resume cómo ejecutar el staging sin sustituir `docs/mvp/STAGING_ACCEPTANCE_V1.md` ni `docs/spike/EXTERNAL_STAGING_RUNBOOK.md`.

## Regla de seguridad

Usar únicamente datos sintéticos y documentos anonimizados. No introducir datos reales de agricultores hasta que los **nueve bloques de aceptación** estén en PASS sobre la misma revisión trazable.

## Recursos externos mínimos

Antes del primer staging real deben existir:

- host Linux con Docker + Compose v2;
- fichero de secretos fuera de Git (`STAGING_ENV_FILE`, modo 0600);
- hostname HTTPS de staging;
- Cloudflare Tunnel apuntando únicamente a `http://127.0.0.1:8088`;
- bucket privado R2/S3-compatible de staging;
- bucket separado y vacío para restore-validation;
- clave AEMET configurada solo en servidor;
- cuenta sintética para el gate HTTPS;
- remitente de correo de staging cuando se ejecute recuperación de contraseña;
- destino de backup realmente fuera del host.

## Comando de estado

```bash
bash scripts/staging-acceptance.sh status
```

Muestra release, SHA real de origen, env file configurado, hostname externo y municipio usado para el gate meteorológico.

El estado canónico del SHA desplegado se guarda en `.deploy/staging/current-source-sha`; `staging-acceptance.sh status` lo expone como `source_sha`. No usar el antiguo nombre con guiones bajos.

Por defecto el gate público consulta `bedmar-y-garciez`. Se puede cambiar sin modificar código:

```bash
export STAGING_PUBLIC_WEATHER_MUNICIPALITY=huelma
```

El valor debe corresponder a un municipio verificado de `public_municipalities`.

## Fase 1 — Preflight

```bash
export STAGING_ENV_FILE=/etc/magina-olivo/staging.env
bash scripts/staging-acceptance.sh preflight
```

Debe validar host, Docker/Compose, permisos del env, HTTPS de Better Auth/R2, trusted origins, AEMET server-side, bind loopback, espacio y reloj.

## Fase 2 — Deploy local + aislamiento + R2

```bash
export STAGING_ENV_FILE=/etc/magina-olivo/staging.env
bash scripts/staging-acceptance.sh deploy-local
```

La fase ejecuta en orden:

1. preflight;
2. build desde checkout limpio;
3. deploy con release y SHA Git trazables;
4. health local;
5. aislamiento de puertos;
6. roundtrip R2 `PUT -> GET -> SHA-256 -> DELETE`.

El deploy se considera inválido si no puede persistir y volver a leer el SHA Git completo de 40 caracteres de la revisión desplegada.

No publica el hostname ni crea/configura Cloudflare Tunnel.

## Fase 3 — Tunnel / hostname

Configurar externamente Cloudflare Tunnel para publicar el hostname de staging contra:

```text
http://127.0.0.1:8088
```

Si se protege con Cloudflare Access, preparar service token específico para gates.

No guardar token de Tunnel ni service token en Git.

## Fase 4 — Gate externo HTTPS + recorrido funcional + Mágina pública

```bash
export STAGING_BASE_URL=https://<staging-hostname>
export STAGING_GATE_EMAIL=<synthetic-email>
export STAGING_GATE_PASSWORD=<synthetic-password>

# Opcional: cambia el municipio de prueba AEMET.
export STAGING_PUBLIC_WEATHER_MUNICIPALITY=bedmar-y-garciez

# Solo si Cloudflare Access protege el hostname:
export CF_ACCESS_CLIENT_ID=<service-token-client-id>
export CF_ACCESS_CLIENT_SECRET=<service-token-client-secret>

bash scripts/staging-acceptance.sh external
```

La fase ejecuta tres gates sobre el mismo hostname:

### A. HTTPS y seguridad

1. TLS/HTTPS y HSTS;
2. cookie Secure/HttpOnly/SameSite;
3. `Cache-Control: no-store` en respuestas privadas;
4. bloqueo de origen hostil;
5. logout y revocación de sesión.

### B. Recorrido agrícola privado

1. recorrido sintético completo de dos usuarios;
2. explotación -> finca -> parcela -> campaña;
3. entrega idempotente de 1.842 kg;
4. rendimiento 21,9 %;
5. labor retry-safe;
6. timeline y resumen deterministas;
7. ticket PDF privado y aislamiento entre usuarios.

### C. Mágina pública

`scripts/staging-public-magina-gate.sh` valida que las páginas públicas respondan por HTTPS:

- `/magina`;
- `/magina/tiempo`;
- `/magina/campo`;
- `/magina/noticias`;
- `/magina/mercado`;
- `/magina/directorio`.

También valida las fuentes y contratos API:

- registro de fuentes públicas;
- directorio de cooperativas/almazaras no vacío y URLs HTTPS;
- RAIF con procedencia, frescura y regla de uso regional, nunca diagnóstico de parcela;
- noticias con política `verified-metadata-only-no-article-copy`, fecha y enlace HTTPS a la fuente;
- contexto de mercado con metadatos de verificación;
- AEMET con municipio correcto, atribución, días de predicción, frescura y modo `live/cache/degraded-cache`.

El gate público falla si AEMET no está configurado o no puede ofrecer ni dato en vivo ni fallback permitido. Esto es intencionado: el primer staging no se considera completo si la pantalla Tiempo está publicada pero no es operativa.

Los tres gates aceptan el mismo service token de Cloudflare Access.

## Fase 5 — Correo de recuperación

Esta fase permanece manual porque requiere comprobar recepción real del mensaje.

Debe demostrar:

- respuesta anti-enumeración;
- recepción real;
- token de un solo uso;
- contraseña nueva válida;
- sesiones anteriores revocadas;
- ausencia de token/URL sensible en logs.

## Fase 6 — Backup off-host

```bash
export STAGING_ENV_FILE=/etc/magina-olivo/staging.env
export BACKUP_DESTINATION_DIR=/mnt/off-host/magina-staging-backups
export BACKUP_DESTINATION_CONFIRMED_OFF_HOST=1
bash scripts/staging-acceptance.sh backup
```

El bundle conserva la etiqueta de release y el **SHA Git exacto** que lo produjo. Un backup no cuenta como validado hasta completar restore.

## Fase 7 — Restore aislado

```bash
export STAGING_ENV_FILE=/etc/magina-olivo/staging.env
export RESTORE_BUNDLE_DIR=/mnt/off-host/magina-staging-backups/<bundle>
export RESTORE_DATABASE=magina_restore_validation
export RESTORE_OBJECT_STORAGE_BUCKET=<restore-validation-bucket>
export RESTORE_TARGETS_CONFIRMED_ISOLATED=1
bash scripts/staging-acceptance.sh restore
```

El restore exige procedencia válida del backup (`application_source_sha`) y verifica checksums y estado relacional. El target nunca debe ser la base ni el bucket activos de staging.

## Fase 8 — Accesibilidad manual

Completar `docs/mvp/ACCESSIBILITY_GATE_V1.md` sobre **la misma revisión desplegada**.

Debe incluir como mínimo:

- teclado completo;
- TalkBack + Chrome Android o NVDA + navegador desktop;
- 200 % zoom/reflow;
- reduced motion;
- foco visible;
- navegación activa anunciada;
- adjunto de ticket operable sin ratón.

## Fase 9 — PWA / offline manual

Con un usuario sintético y sobre la misma revisión:

1. instalar/abrir PWA;
2. iniciar sesión online;
3. cortar red;
4. crear entrega;
5. crear labor;
6. verificar pendientes visibles por tipo;
7. cerrar/reabrir sin red y comprobar `Modo protegido`;
8. recuperar red y revalidar sesión;
9. sincronizar/reintentar;
10. comprobar una sola entrega y una sola labor en servidor;
11. confirmar timeline actualizado;
12. confirmar bloqueo de logout mientras hay pendientes y desbloqueo tras sync;
13. confirmar que un fallo de sincronización no borra la outbox;
14. confirmar que un ticket no se promete como guardado offline antes de una subida real.

## Criterio de salida

No iniciar piloto hasta tener evidencia PASS para los **nueve bloques**:

1. host/contenedores;
2. HTTPS/seguridad;
3. recorrido sintético funcional;
4. Mágina pública y fuentes externas;
5. almacenamiento privado;
6. correo/reset;
7. backup/restore;
8. accesibilidad;
9. PWA/offline.

Después: validación cerrada con 2–5 olivareros usando todavía datos sintéticos o documentos anonimizados.
