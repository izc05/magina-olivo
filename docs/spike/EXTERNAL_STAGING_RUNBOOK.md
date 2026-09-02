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
Fastify ---- HTTPS API --------------- transactional mail provider
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
- salida a Internet hacia Cloudflare/R2/proveedor de correo;
- reloj/NTP correcto.

El host no necesita Node/npm para deploy, backup o restore: las utilidades Node operativas viajan dentro de la imagen runtime.

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

AUTH_MAIL_TRANSPORT=resend
AUTH_MAIL_FROM=Mágina Olivo <no-reply@<verified-staging-domain>>
RESEND_API_KEY=<staging-only-api-key>

PRIVATE_STORAGE_DRIVER=s3
OBJECT_STORAGE_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
OBJECT_STORAGE_BUCKET=<private-staging-bucket>
OBJECT_STORAGE_REGION=auto
OBJECT_STORAGE_ACCESS_KEY_ID=<staging-r2-access-key>
OBJECT_STORAGE_SECRET_ACCESS_KEY=<staging-r2-secret>
OBJECT_STORAGE_FORCE_PATH_STYLE=true

STAGING_BIND=127.0.0.1:8088
LOG_LEVEL=info
```

`AUTH_MAIL_TRANSPORT=capture` está prohibido fuera de `NODE_ENV=test`.

No activar `AUTH_MAIL_TRANSPORT=resend` hasta que:

- el dominio/remitente de staging esté verificado en el proveedor;
- la API key sea exclusiva de staging;
- el correo de recuperación end-to-end se vaya a probar con una cuenta sintética.

Los scripts de deploy/backup/restore eliminan del entorno heredado las variables sensibles conocidas antes de renderizar Compose: el env file gestionado es la fuente autoritativa.

## 4. Cloudflare R2

Crear dos buckets de staging:

```text
<private-staging-bucket>
<restore-validation-bucket>
```

El primero es el almacenamiento privado de la aplicación. El segundo existe únicamente para simulacros de restore y debe estar vacío antes de cada gate.

Las credenciales usadas para el simulacro deben poder operar sobre esos recursos de staging y no deben dar acceso a buckets de producción.

Endpoint S3 estándar:

```text
https://<ACCOUNT_ID>.r2.cloudflarestorage.com
```

Región:

```text
auto
```

Antes de elegir la localización definitiva, decidir si se necesita una jurisdicción explícita de datos. Si se usa jurisdicción EU, el endpoint cambia y la decisión no debe improvisarse después de crear el bucket.

Gate obligatorio una vez creadas las credenciales:

```bash
set -a
source /etc/magina-olivo/staging.env
set +a
NODE_ENV=production node scripts/r2-roundtrip-gate.mjs
```

Si el host no tiene Node, ejecutar el mismo script dentro de la imagen runtime desplegada.

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

# Solo si Cloudflare Access protege el hostname:
export CF_ACCESS_CLIENT_ID=<service-token-client-id>
export CF_ACCESS_CLIENT_SECRET=<service-token-client-secret>

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
- origen hostil rechazado para mutaciones autenticadas;
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

Montar o preparar un destino que físicamente/lógicamente esté fuera del host de staging y ejecutar:

```bash
export STAGING_ENV_FILE=/etc/magina-olivo/staging.env
export BACKUP_DESTINATION_DIR=/mnt/off-host/magina-staging-backups
export BACKUP_DESTINATION_CONFIRMED_OFF_HOST=1
bash scripts/staging-backup.sh
```

El script se niega a continuar sin la confirmación explícita de destino externo.

Cada bundle contiene:

```text
postgres.dump
backup-meta.txt
database-manifest.txt
SHA256SUMS
objects/
  objects-manifest.json
  <object-key files...>
```

`database-manifest.txt` conserva conteos de entidades críticas, suma de kilos y estado de migraciones para verificar el restore. `objects-manifest.json` conserva key, tamaño y SHA-256 de cada objeto privado.

El bundle no contiene el env file ni credenciales.

## 10. Restore no destructivo

Un backup no se marca PASS hasta restaurarlo.

El simulacro usa:

- una base PostgreSQL separada, por defecto `magina_restore_validation`;
- un bucket R2 de recuperación separado y vacío;
- el staging activo permanece intacto.

Ejemplo:

```bash
export STAGING_ENV_FILE=/etc/magina-olivo/staging.env
export RESTORE_BUNDLE_DIR=/mnt/off-host/magina-staging-backups/<bundle>
export RESTORE_DATABASE=magina_restore_validation
export RESTORE_OBJECT_STORAGE_BUCKET=<restore-validation-bucket>
export RESTORE_TARGETS_CONFIRMED_ISOLATED=1
bash scripts/staging-restore-gate.sh
```

Si la base aislada ya existe de un simulacro anterior, solo se recrea con:

```bash
export RESTORE_DATABASE_CONFIRM_RECREATE=1
```

El gate:

1. verifica primero `SHA256SUMS`;
2. rechaza usar `magina_olivo` como base de restore;
3. restaura el dump PG18 en la base aislada;
4. reconstruye un manifiesto relacional y exige `diff` exacto contra el backup;
5. valida tamaño y SHA-256 de todos los archivos del snapshot;
6. exige que el bucket de restore esté vacío;
7. sube los objetos al bucket separado;
8. vuelve a descargarlos y verifica SHA-256;
9. compara el inventario final del bucket con el manifiesto.

El importador rechaza por defecto restaurar en el mismo nombre de bucket que figura como origen del backup. En caso de fallo durante carga de objetos intenta limpiar el conjunto parcial que hubiera subido.

## 11. Password recovery real

El comportamiento backend ya está probado en CI:

- reset de un solo uso;
- cambio real de contraseña;
- revocación de sesiones anteriores;
- `capture` de CI no imprime el token.

El transporte de staging usa el adapter `resend` mediante llamada HTTPS directa, sin SDK adicional. La petición pública de reset no espera la respuesta remota del proveedor, evitando introducir una diferencia de tiempo dependiente de si el usuario existe.

Gate manual inicial:

1. verificar dominio/remitente de staging en Resend;
2. configurar `AUTH_MAIL_TRANSPORT=resend`, `AUTH_MAIL_FROM` y `RESEND_API_KEY` en el env file;
3. desplegar de nuevo;
4. solicitar reset para una cuenta sintética;
5. confirmar recepción del correo;
6. completar el reset;
7. comprobar que sesiones anteriores quedan invalidadas;
8. comprobar que el token no puede reutilizarse.

Nunca registrar la URL de reset, el API key ni el cuerpo de error del proveedor.

## 12. Criterio PASS de staging externo

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
- Resend Email API: https://resend.com/docs/api-reference/emails/send-email
- Resend authentication/base URL: https://resend.com/docs/api-reference/introduction
