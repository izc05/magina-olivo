# Mágina Olivo — Staging Execution V1

Estado: **procedimiento operativo preparado; requiere recursos externos reales**.

Rama objetivo: `feat/integration-v2-mvp-v1`.

Este documento resume cómo ejecutar el staging sin sustituir `docs/mvp/STAGING_ACCEPTANCE_V1.md` ni `docs/spike/EXTERNAL_STAGING_RUNBOOK.md`.

## Regla de seguridad

Usar únicamente datos sintéticos y documentos anonimizados. No introducir datos reales de agricultores hasta que los ocho bloques de aceptación estén en PASS.

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

Debe validar host, Docker/Compose, permisos del env, HTTPS de Better Auth/R2, trusted origins, bind loopback, espacio y reloj.

## Fase 2 — Deploy local + aislamiento + R2

```bash
export STAGING_ENV_FILE=/etc/magina-olivo/staging.env
bash scripts/staging-acceptance.sh deploy-local
```

La fase ejecuta en orden:

1. preflight;
2. build desde checkout limpio;
3. deploy con release trazable;
4. health local;
5. aislamiento de puertos;
6. roundtrip R2 `PUT -> GET -> SHA-256 -> DELETE`.

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

Un backup no cuenta como validado hasta completar restore.

## Fase 7 — Restore aislado

```bash
export STAGING_ENV_FILE=/etc/magina-olivo/staging.env
export RESTORE_BUNDLE_DIR=/mnt/off-host/magina-staging-backups/<bundle>
export RESTORE_DATABASE=magina_restore_validation
export RESTORE_OBJECT_STORAGE_BUCKET=<restore-validation-bucket>
export RESTORE_TARGETS_CONFIRMED_ISOLATED=1
bash scripts/staging-acceptance.sh restore
```

El target nunca debe ser la base ni el bucket activos de staging.

## Fase 8 — Gates manuales finales

Completar sobre el mismo staging:

- `docs/mvp/ACCESSIBILITY_GATE_V1.md`;
- PWA/offline manual según `docs/mvp/STAGING_ACCEPTANCE_V1.md`.

## Criterio de salida

No iniciar piloto hasta tener evidencia PASS para:

1. host/contenedores;
2. HTTPS/seguridad;
3. recorrido sintético funcional;
4. Mágina pública y fuentes externas;
5. almacenamiento privado;
6. correo/reset;
7. backup/restore;
8. accesibilidad + PWA/offline.

Después: validación cerrada con 2–5 olivareros usando todavía datos sintéticos o documentos anonimizados.
