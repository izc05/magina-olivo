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
- cuenta sintética para el gate HTTPS;
- remitente de correo de staging cuando se ejecute recuperación de contraseña;
- destino de backup realmente fuera del host.

## Comando de estado

```bash
bash scripts/staging-acceptance.sh status
```

Muestra release, SHA real de origen, env file configurado y hostname externo.

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

## Fase 4 — Gate externo HTTPS + recorrido funcional

```bash
export STAGING_BASE_URL=https://<staging-hostname>
export STAGING_GATE_EMAIL=<synthetic-email>
export STAGING_GATE_PASSWORD=<synthetic-password>

# Solo si Cloudflare Access protege el hostname:
export CF_ACCESS_CLIENT_ID=<service-token-client-id>
export CF_ACCESS_CLIENT_SECRET=<service-token-client-secret>

bash scripts/staging-acceptance.sh external
```

La fase ejecuta:

1. TLS/HTTPS, HSTS, cookie Secure/HttpOnly/SameSite, `no-store`, origin hostile y logout;
2. recorrido sintético completo de dos usuarios;
3. explotación -> finca -> parcela -> campaña;
4. entrega idempotente de 1.842 kg;
5. rendimiento 21,9 %;
6. labor retry-safe;
7. timeline y resumen deterministas;
8. ticket PDF privado y aislamiento entre usuarios.

El recorrido funcional acepta el mismo service token de Cloudflare Access que el gate HTTPS.

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
4. almacenamiento privado;
5. correo/reset;
6. backup/restore;
7. accesibilidad;
8. PWA/offline.

Después: validación cerrada con 2–5 olivareros usando todavía datos sintéticos o documentos anonimizados.
