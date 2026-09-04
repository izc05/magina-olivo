# Mágina Olivo — Checklist previo a `preflight` / Staging V6

Hoja auxiliar para usar justo antes de ejecutar el primer `preflight` real.

Candidato obligatorio:

```text
SHA=33dda6be7f74d9ffc33761177ed5ca3105bd492d
```

No anotar secretos en esta hoja.

## Host

- [ ] Linux compatible.
- [ ] Docker Engine operativo para el usuario de staging.
- [ ] Docker Compose v2 operativo.
- [ ] Git disponible.
- [ ] Al menos 5 GiB libres en el almacenamiento de PostgreSQL.
- [ ] Reloj/NTP correcto o incidencia registrada.
- [ ] `127.0.0.1:8088` disponible.
- [ ] `bash scripts/mini-pc-readiness.sh` sin FAIL.

## Checkout

- [ ] `git fetch --all --prune` ejecutado.
- [ ] `STAGING_EXPECTED_SOURCE_SHA` fijado al SHA V6.
- [ ] `git switch --detach "$STAGING_EXPECTED_SOURCE_SHA"` ejecutado.
- [ ] `git rev-parse HEAD` = SHA V6.
- [ ] `git status --short` vacío.

## Fichero externo

- [ ] `/etc/magina-olivo/staging.env` existe.
- [ ] El usuario que ejecuta Docker puede leerlo.
- [ ] Permisos de grupo/otros deshabilitados (modo 600 recomendado).
- [ ] No se ha ejecutado `source` sobre el fichero.

## Configuración de aplicación

- [ ] `POSTGRES_PASSWORD` generado solo para staging.
- [ ] `DATABASE_URL` apunta al servicio Compose `postgres`.
- [ ] `BETTER_AUTH_SECRET` generado solo para staging.
- [ ] Hostname de staging decidido.
- [ ] `BETTER_AUTH_URL=https://<staging-host>`.
- [ ] `BETTER_AUTH_TRUSTED_ORIGINS` incluye exactamente ese origen.
- [ ] `STAGING_BIND=127.0.0.1:8088`.

## AEMET

- [ ] API Key dedicada a staging creada.
- [ ] Es una clave actual con fecha de caducidad, no una antigua indefinida.
- [ ] Fecha de creación registrada sin copiar la clave.
- [ ] Fecha objetivo de rotación anotada fuera de secretos.
- [ ] `AEMET_API_KEY` solo está en el env server-side.

## R2 activo

- [ ] R2 está habilitado en la cuenta Cloudflare.
- [ ] Bucket `magina-olivo-staging-private` (o nombre acordado) creado.
- [ ] Bucket no tiene `r2.dev` ni dominio público habilitado.
- [ ] Token S3 `Object Read & Write` limitado al/los bucket(s) de staging.
- [ ] Access Key ID guardado de forma segura.
- [ ] Secret Access Key guardado de forma segura (solo se muestra una vez al crear token).
- [ ] `OBJECT_STORAGE_ENDPOINT` correcto.
- [ ] `OBJECT_STORAGE_BUCKET` correcto.
- [ ] `OBJECT_STORAGE_ACCESS_KEY_ID` configurado.
- [ ] `OBJECT_STORAGE_SECRET_ACCESS_KEY` configurado.

## Correo — estado inicial

Antes del primer deploy local:

- [ ] `AUTH_MAIL_TRANSPORT=disabled`.
- [ ] No se considera todavía PASS el bloque de correo.
- [ ] Resend se configurará solo después de obtener deploy local + Tunnel funcionales.

## Recursos que NO bloquean este preflight

No hace falta tener todavía:

- [ ] Cloudflare Tunnel configurado.
- [ ] Cloudflare Access configurado.
- [ ] cuenta sintética externa creada.
- [ ] dominio de Resend verificado.
- [ ] API key de Resend activa.
- [ ] destino off-host de backup montado.
- [ ] segundo bucket de restore creado.

Estas casillas no son requisitos para lanzar `preflight`; están aquí para evitar confundirlas con bloqueantes actuales.

## Comando

Cuando las secciones bloqueantes estén completas:

```bash
export STAGING_EXPECTED_SOURCE_SHA=33dda6be7f74d9ffc33761177ed5ca3105bd492d
export STAGING_ENV_FILE=/etc/magina-olivo/staging.env
bash scripts/staging-acceptance.sh status
bash scripts/staging-acceptance.sh preflight
```

Resultado:

```text
PASS -> continuar a deploy-local
FAIL -> corregir únicamente host/configuración/recurso externo afectado; no cambiar V6
```
