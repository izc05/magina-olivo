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
- `curl` y utilidades Linux básicas;
- espacio persistente para PostgreSQL;
- salida a Internet hacia Cloudflare/R2/proveedor de correo;
- reloj/NTP correcto.

El host no necesita Node/npm para deploy, R2 gate, backup o restore: las utilidades Node operativas viajan dentro de la imagen runtime.

Un host compartido es válido. Otros servicios pueden usar puertos 3001/5432; lo importante es que **los contenedores de Mágina no publiquen esos puertos**. Esto se demuestra después del deploy mediante Docker inspect/port.

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
POSTGRES_PASSWORD=<random-staging-only>
DATABASE_URL=postgres://magina:<password>@postgres:5432/magina_olivo
BETTER_AUTH_SECRET=<random-staging-only>
BETTER_AUTH_URL=https://<staging-hostname>
BETTER_AUTH_TRUSTED_ORIGINS=https://<staging-hostname>

# Puede mantenerse disabled hasta la prueba real de correo.
AUTH_MAIL_TRANSPORT=disabled
AUTH_MAIL_FROM="Mágina Olivo <no-reply@<verified-staging-domain>>"
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

**No ejecutar `source /etc/magina-olivo/staging.env`.** El fichero sigue sintaxis de env de Docker Compose, no se trata como script shell; además, los secretos no necesitan cargarse en el proceso interactivo del operador.

Los scripts de deploy/R2/backup/restore usan Docker Compose o el contenedor API para consumir la configuración sin imprimir valores sensibles.

## 4. Preflight del host

```bash
export STAGING_ENV_FILE=/etc/magina-olivo/staging.env
bash scripts/staging-host-preflight.sh
```

Debe quedar verde antes del primer deploy.

Comprueba Linux/arquitectura, Docker, Compose, permisos del env file, claves mínimas, HTTPS de Better Auth/R2, trusted origins, loopback, disco y reloj. En un host compartido, detectar otro proceso en 3001/5432 produce una advertencia, no un falso bloqueo; el aislamiento real de Mágina se verifica después del deploy.

## 5. Cloudflare R2 — preparar recursos

Crear dos buckets de staging:

```text
<private-staging-bucket>
<restore-validation-bucket>
```

El primero es el almacenamiento privado de la aplicación. El segundo existe únicamente para simulacros de restore y debe estar vacío antes de cada gate.

Las credenciales de staging no deben dar acceso a buckets de producción.

Endpoint S3 estándar:

```text
https://<ACCOUNT_ID>.r2.cloudflarestorage.com
```

Región habitual:

```text
auto
```

Antes de elegir la localización definitiva, decidir si se necesita jurisdicción explícita de datos. Si se usa jurisdicción EU, el endpoint cambia y la decisión no debe improvisarse después de crear los buckets.

## 6. Primer deploy A

```bash
export STAGING_ENV_FILE=/etc/magina-olivo/staging.env
bash scripts/staging-release.sh deploy <git-sha-or-release-tag-A>
bash scripts/staging-release.sh status
```

Debe existir un `current` claro.

Todavía **no conectar Cloudflare Tunnel**.

## 7. Gate de aislamiento local

```bash
bash scripts/staging-host-postdeploy-gate.sh
```

Debe probar:

- PostgreSQL/API healthy;
- worker/web running;
- PostgreSQL sin host ports;
- API sin host ports;
- worker sin host ports;
- Nginx únicamente en `127.0.0.1:<STAGING_BIND>`;
- health 200 por Nginx local;
- raíz PWA 200 por la misma entrada.

Si falla, no publicar el hostname.

## 8. Gate R2 real

Con A desplegado e isolation gate verde:

```bash
bash scripts/staging-r2-gate.sh
```

El wrapper localiza el contenedor API ya desplegado y ejecuta dentro de él:

```text
PUT -> GET -> SHA-256 -> DELETE -> GET must fail
```

Ventajas:

- no necesita Node en el host;
- no necesita `source` del env file;
- no copia las credenciales R2 al shell interactivo;
- prueba exactamente el mismo endpoint/bucket/credenciales que usa la API desplegada.

Debe terminar con:

```text
[r2-roundtrip-gate] PASS PUT/GET/SHA-256/DELETE
[staging-r2-gate] PASS release=<release>
```

## 9. Cloudflare Tunnel

Usar preferentemente un Tunnel gestionado remotamente.

Publicar un único hostname de staging hacia:

```text
http://127.0.0.1:8088
```

El token del Tunnel es secreto y nunca entra en Git ni en el env de la aplicación.

El proceso `cloudflared` puede ejecutarse como servicio del host o contenedor separado, pero no debe compartir credenciales de PostgreSQL/R2/Better Auth.

Si staging no debe quedar públicamente accesible, proteger el hostname con Cloudflare Access y usar una cuenta/service token específico para los gates automatizados.

## 10. Gate HTTPS real

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
- HSTS;
- login válido;
- `Set-Cookie` con `HttpOnly`, `Secure`, `SameSite=Lax`;
- `/api/v1/me` privado con `no-store`;
- origen hostil rechazado para mutaciones autenticadas;
- logout real;
- sesión antigua inválida después del logout.

No imprimir respuestas de login completas.

## 11. Password recovery real

El comportamiento backend ya está probado en CI:

- token de reset de un solo uso;
- cambio real de contraseña;
- revocación de sesiones anteriores;
- `capture` de CI no imprime el token.

Para la prueba real:

1. verificar dominio/remitente de staging en Resend;
2. editar el env file: `AUTH_MAIL_TRANSPORT=resend`;
3. mantener `AUTH_MAIL_FROM` entre comillas si contiene espacios;
4. añadir `RESEND_API_KEY` staging-only;
5. desplegar una nueva release/configuración;
6. repetir `staging-host-postdeploy-gate.sh`;
7. solicitar reset para una cuenta sintética;
8. confirmar recepción del correo;
9. completar el reset;
10. comprobar sesiones antiguas inválidas y token no reutilizable.

La llamada pública de reset no espera al proveedor remoto. Los fallos de envío no imprimen email, URL/token, body del proveedor ni credenciales.

## 12. Deploy B y rollback A

```bash
bash scripts/staging-release.sh deploy <release-B>
bash scripts/staging-host-postdeploy-gate.sh
bash scripts/staging-release.sh status
```

Repetir el gate HTTPS externo.

Después:

```bash
bash scripts/staging-release.sh rollback
bash scripts/staging-host-postdeploy-gate.sh
bash scripts/staging-release.sh status
```

Repetir otra vez el gate HTTPS externo.

No usar migraciones destructivas durante el piloto. Las migraciones deben mantenerse aditivas/backward-compatible para que rollback de código sea seguro.

## 13. Backup fuera del host

No considerar operativo el backup si el único dump permanece en el mismo servidor.

Montar o preparar un destino que esté fuera del host de staging:

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

`database-manifest.txt` conserva conteos de entidades críticas, suma de kilos y estado de migraciones. `objects-manifest.json` conserva key, tamaño y SHA-256 por objeto.

El bundle no contiene el env file ni credenciales.

## 14. Restore no destructivo

Un backup no se marca PASS hasta restaurarlo.

El simulacro usa:

- base PostgreSQL separada, por defecto `magina_restore_validation`;
- bucket R2 de recuperación separado y vacío;
- staging activo intacto.

```bash
export STAGING_ENV_FILE=/etc/magina-olivo/staging.env
export RESTORE_BUNDLE_DIR=/mnt/off-host/magina-staging-backups/<bundle>
export RESTORE_DATABASE=magina_restore_validation
export RESTORE_OBJECT_STORAGE_BUCKET=<restore-validation-bucket>
export RESTORE_TARGETS_CONFIRMED_ISOLATED=1
bash scripts/staging-restore-gate.sh
```

Si la base aislada ya existe de un simulacro anterior:

```bash
export RESTORE_DATABASE_CONFIRM_RECREATE=1
```

El gate:

1. verifica `SHA256SUMS` antes de restaurar;
2. rechaza `magina_olivo` como target;
3. restaura PG18 en la base aislada;
4. reconstruye el manifiesto relacional y exige `diff` exacto;
5. valida tamaño + SHA-256 del snapshot de objetos;
6. exige bucket de restore vacío;
7. sube objetos al bucket separado;
8. vuelve a descargarlos y verifica SHA-256;
9. compara inventario final contra manifiesto;
10. intenta limpiar objetos parciales si falla la carga.

## 15. Criterio PASS de staging externo

Staging externo se marca PASS únicamente cuando se conservan evidencias de:

- host preflight;
- deploy A healthy;
- aislamiento local de puertos;
- R2 roundtrip real;
- HTTPS válido;
- cookie `Secure` real;
- origin/CSRF bajo proxy;
- password recovery por correo real;
- deploy B + aislamiento + HTTPS;
- rollback A + aislamiento + HTTPS;
- backup realmente fuera del host;
- restore limpio de PostgreSQL + objetos;
- cero datos personales reales durante las pruebas.

Solo después puede plantearse un piloto cerrado con agricultores.

Documentación específica de los gates locales: `docs/spike/STAGING_HOST_GATES.md`.
