# Mágina Olivo — External staging runbook

Estado: **preparado para ejecución cuando exista host + hostname + credenciales de staging**.

Este runbook empieza donde termina el smoke CI. No introduce datos reales y no convierte staging en producción.

## Arquitectura objetivo

```text
Internet
   |
 HTTPS Cloudflare
   |
Cloudflare Tunnel (outbound only)
   |
127.0.0.1:8088
   |
Nginx / PWA
   +-- /api    -> Fastify:3001
   +-- /health -> Fastify:3001

Fastify ---- private Docker networks ---- PostgreSQL 18.6
Worker  ----- private Docker network  ---- PostgreSQL 18.6
Fastify ---- HTTPS S3 API ------------ Cloudflare R2 private bucket
```

Reglas duras:

- PostgreSQL no publica puerto host.
- Fastify no publica puerto host.
- worker no publica endpoint público.
- Nginx solo enlaza `127.0.0.1:8088`.
- Tunnel es el único camino de entrada desde Internet.
- staging usa solo datos sintéticos.

## 1. Host

Prerequisitos mínimos:

- Linux x86_64 o arm64 compatible con las imágenes elegidas;
- Docker Engine + Docker Compose v2;
- Git;
- `curl`;
- espacio persistente para PostgreSQL;
- salida a Internet hacia Cloudflare/R2;
- reloj/NTP correcto.

No abrir 5432 ni 3001 en firewall/NAT.

## 2. Checkout

Clonar el repositorio y seleccionar exactamente la revisión que se desea probar.

Nunca ejecutar staging desde un working tree con cambios sin commit.

Antes del deploy:

```bash
git status --short
git rev-parse HEAD
```

La revisión desplegada debe quedar registrada como release.

## 3. Env file de staging

Crear fuera del repositorio, por ejemplo:

```text
/etc/magina-olivo/staging.env
```

Permisos recomendados:

```bash
sudo chown root:root /etc/magina-olivo/staging.env
sudo chmod 600 /etc/magina-olivo/staging.env
```

Variables mínimas:

```dotenv
POSTGRES_PASSWORD=<random staging-only>
DATABASE_URL=postgres://magina:<password>@postgres:5432/magina_olivo
BETTER_AUTH_SECRET=<random staging-only>
BETTER_AUTH_URL=https://<staging-hostname>
BETTER_AUTH_TRUSTED_ORIGINS=https://<staging-hostname>

PRIVATE_STORAGE_DRIVER=s3
OBJECT_STORAGE_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
OBJECT_STORAGE_BUCKET=<private-staging-bucket>
OBJECT_STORAGE_REGION=auto
OBJECT_STORAGE_ACCESS_KEY_ID=<bucket-scoped-access-key>
OBJECT_STORAGE_SECRET_ACCESS_KEY=<bucket-scoped-secret>
OBJECT_STORAGE_FORCE_PATH_STYLE=true

STAGING_BIND=127.0.0.1:8088
LOG_LEVEL=info
```

`AUTH_MAIL_TRANSPORT=capture` está prohibido fuera de `NODE_ENV=test`. El proveedor de correo real se añadirá mediante un adapter separado antes del piloto.

## 4. Cloudflare R2

Crear un bucket **solo para staging**.

La credencial S3 debe tener únicamente lectura/escritura de objetos sobre el bucket necesario, nunca permisos globales si no hacen falta.

Endpoint S3 estándar:

```text
https://<ACCOUNT_ID>.r2.cloudflarestorage.com
```

Región:

```text
auto
```

Antes de elegir la localización definitiva, decidir si se necesita una jurisdicción explícita de datos. Si se usa jurisdicción EU, el endpoint incorpora `.eu.` y la decisión no debe improvisarse después de crear el bucket.

Gate obligatorio una vez creadas las credenciales:

```bash
set -a
source /etc/magina-olivo/staging.env
set +a
NODE_ENV=production node scripts/r2-roundtrip-gate.mjs
```

Debe terminar únicamente con:

```text
[r2-roundtrip-gate] PASS PUT/GET/SHA-256/DELETE
```

El gate crea un objeto aleatorio, verifica bytes + SHA-256 y lo elimina.

## 5. Primer deploy

```bash
export STAGING_ENV_FILE=/etc/magina-olivo/staging.env
bash scripts/staging-release.sh deploy <git-sha-or-release-tag>
```

Después:

```bash
bash scripts/staging-release.sh status
```

Debe existir un `current` claro. A partir del segundo deploy también existirá `previous` para rollback.

## 6. Cloudflare Tunnel

Usar preferentemente un Tunnel gestionado remotamente.

Publicar un único hostname de staging hacia:

```text
http://127.0.0.1:8088
```

El token del Tunnel es secreto y nunca entra en Git ni en el env de la aplicación.

El proceso `cloudflared` puede ejecutarse como servicio del host o contenedor separado, pero no debe compartir las credenciales de PostgreSQL/R2/Better Auth.

Si staging no debe quedar públicamente accesible, proteger el hostname con Cloudflare Access y usar una cuenta/service token específico para los gates automatizados.

## 7. Gate HTTPS real

Crear previamente una cuenta sintética de staging y ejecutar:

```bash
export STAGING_BASE_URL=https://<staging-hostname>
export STAGING_GATE_EMAIL=<synthetic-email>
export STAGING_GATE_PASSWORD=<synthetic-password>
bash scripts/staging-https-gate.sh
```

El gate exige:

- TLS/HTTPS válido;
- `/health/ready` 200;
- entrada PWA accesible;
- HSTS en el edge/web;
- login válido;
- `Set-Cookie` con `HttpOnly`, `Secure`, `SameSite=Lax`;
- `/api/v1/me` privado con `no-store`;
- logout real;
- sesión antigua inválida después del logout.

No imprimir respuestas de login completas.

## 8. Deploy B y rollback

Después de tener A healthy:

```bash
bash scripts/staging-release.sh deploy <release-B>
bash scripts/staging-release.sh status
bash scripts/staging-release.sh rollback
bash scripts/staging-release.sh status
```

Verificar por HTTPS tras cada transición.

No usar migraciones destructivas durante el piloto. Las migraciones deben mantenerse aditivas/backward-compatible para que rollback de código sea seguro.

## 9. Backup fuera del host

No considerar operativo el backup si el único dump permanece en el mismo servidor.

El bundle mínimo incluye:

- dump PostgreSQL custom-format con herramientas PG18;
- manifiesto con fecha, revisión de aplicación y checksum;
- inventario/copia independiente de objetos privados;
- destino fuera del host de staging.

Nunca guardar secrets junto al bundle.

Tras crear el primer backup externo hay que restaurarlo en un destino limpio y repetir verificaciones de registros + checksum antes de marcar PASS.

## 10. Password recovery

El comportamiento backend ya está probado en CI:

- reset de un solo uso;
- cambio real de contraseña;
- revocación de sesiones anteriores.

Antes del piloto falta conectar el adapter a un proveedor transaccional real y probar un correo de extremo a extremo bajo el hostname de staging.

## 11. Criterio PASS de staging externo

Staging externo se marca PASS únicamente cuando se conservan evidencias de:

- deploy healthy;
- HTTPS válido;
- cookie `Secure` real;
- origin/CSRF bajo proxy;
- R2 PUT/GET/hash/DELETE;
- password recovery por correo real;
- deploy de segunda release + rollback;
- backup fuera del host;
- restore limpio de PostgreSQL + objetos;
- cero datos personales reales durante las pruebas.

Solo después puede plantearse un piloto cerrado con agricultores.

## Fuentes operativas

- Cloudflare Tunnel setup: https://developers.cloudflare.com/tunnel/setup/
- Cloudflare Tunnel routing: https://developers.cloudflare.com/tunnel/routing/
- Cloudflare Tunnel tokens: https://developers.cloudflare.com/tunnel/advanced/tunnel-tokens/
- Cloudflare R2 S3: https://developers.cloudflare.com/r2/get-started/s3/
- Cloudflare R2 S3 compatibility: https://developers.cloudflare.com/r2/api/s3/api/
- Cloudflare R2 data location: https://developers.cloudflare.com/r2/reference/data-location/
