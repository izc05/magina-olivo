# Mágina Olivo — External staging runbook

Estado: **preparado para ejecución cuando exista host + hostname + credenciales de staging**.

Rama objetivo de esta fase: `feat/integration-v2-mvp-v1`
Base funcional: `feat/mvp-core-v1`
PR de integración: #6
Gate operativo: issue #7

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
Nginx / PWA Visual V2 integrada
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
- el checkout desplegado debe estar limpio y completamente trazado a un SHA real.

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

## 2. Checkout y revisión exacta

Clonar el repositorio y seleccionar exactamente la revisión de `feat/integration-v2-mvp-v1` que se desea probar.

Ejemplo:

```bash
git fetch origin
git switch feat/integration-v2-mvp-v1
git pull --ff-only
git status --short
git rev-parse HEAD
```

`git status --short` debe estar vacío.

El propio `scripts/staging-release.sh` aplica un segundo bloqueo: **rechaza automáticamente cualquier deploy si existe un cambio tracked o un fichero no ignorado sin commit**.

No desplegar nunca desde un working tree modificado localmente.

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

Partir de `infra/docker/staging.env.example` y usar únicamente secretos de staging.

Variables mínimas:

```dotenv
POSTGRES_PASSWORD=<random-staging-only>
DATABASE_URL=postgres://magina:<password>@postgres:5432/magina_olivo
BETTER_AUTH_SECRET=<random-staging-only>
BETTER_AUTH_URL=https://<staging-hostname>
BETTER_AUTH_TRUSTED_ORIGINS=https://<staging-hostname>

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

**No ejecutar `source /etc/magina-olivo/staging.env`.** El fichero usa sintaxis de Docker Compose y los secretos no necesitan cargarse en el shell interactivo.

## 4. Preflight del host

```bash
export STAGING_ENV_FILE=/etc/magina-olivo/staging.env
bash scripts/staging-host-preflight.sh
```

Debe quedar verde antes del primer deploy.

Comprueba Linux/arquitectura, Docker, Compose, permisos del env file, claves mínimas, HTTPS de Better Auth/R2, trusted origins, loopback, disco y reloj.

## 5. Cloudflare R2 — preparar recursos

Crear dos buckets de staging:

```text
<private-staging-bucket>
<restore-validation-bucket>
```

El primero es el almacenamiento privado de la aplicación. El segundo existe únicamente para simulacros de restore y debe estar vacío antes de cada gate.

Las credenciales de staging no deben dar acceso a producción.

Endpoint S3 estándar:

```text
https://<ACCOUNT_ID>.r2.cloudflarestorage.com
```

Región habitual:

```text
auto
```

Si se requiere jurisdicción EU, decidirla antes de crear los buckets y usar el endpoint correspondiente.

## 6. Primer deploy A

La forma recomendada es dejar que el script derive la etiqueta del SHA actual:

```bash
export STAGING_ENV_FILE=/etc/magina-olivo/staging.env
bash scripts/staging-release.sh deploy
bash scripts/staging-release.sh status
```

También se puede usar una etiqueta humana explícita:

```bash
bash scripts/staging-release.sh deploy staging-a
```

pero **la etiqueta no es la evidencia de código**. Las imágenes guardan siempre el SHA real en:

```text
org.opencontainers.image.revision
```

y el estado del deploy conserva:

```text
current=<release-label>
current_source_sha=<full-git-sha>
previous=<previous-release-label>
previous_source_sha=<previous-full-git-sha>
```

Después del deploy, `current_source_sha` debe coincidir exactamente con `git rev-parse HEAD`.

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

El wrapper localiza el contenedor API y ejecuta dentro de él:

```text
PUT -> GET -> SHA-256 -> DELETE -> GET must fail
```

Debe terminar en PASS sin copiar las credenciales R2 al shell interactivo.

## 9. Cloudflare Tunnel

Usar preferentemente un Tunnel gestionado remotamente.

Publicar un único hostname de staging hacia:

```text
http://127.0.0.1:8088
```

El token del Tunnel es secreto y nunca entra en Git ni en el env de la aplicación.

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

## 11. Recorrido sintético integrado

Ejecutar el flujo productivo sobre el mismo commit desplegado:

```bash
API_BASE=https://<staging-hostname> bash scripts/mvp-core-flow-gate.sh
```

Debe probar con datos sintéticos:

- dos usuarios aislados;
- explotación -> finca -> parcela -> campaña;
- entrega 1.842 kg + idempotencia;
- rendimiento posterior 21,9 %;
- labor de poda + replay retry-safe;
- timeline unificado;
- resumen determinista;
- ticket privado con roundtrip exacto;
- bloqueo de acceso cruzado.

Además se debe recorrer manualmente la presentación integrada Visual V2 del PR #6.

## 12. Password recovery real

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

## 13. Deploy B y rollback A

```bash
bash scripts/staging-release.sh deploy staging-b
bash scripts/staging-host-postdeploy-gate.sh
bash scripts/staging-release.sh status
```

Registrar el nuevo `current_source_sha` y repetir el gate HTTPS externo.

Después:

```bash
bash scripts/staging-release.sh rollback
bash scripts/staging-host-postdeploy-gate.sh
bash scripts/staging-release.sh status
```

El rollback recupera tanto la etiqueta anterior como el SHA de origen de la imagen. Repetir el gate HTTPS externo.

No usar migraciones destructivas durante el piloto. Las migraciones deben mantenerse aditivas/backward-compatible para que rollback de código sea seguro.

## 14. Backup fuera del host

Montar o preparar un destino realmente externo al host de staging:

```bash
export STAGING_ENV_FILE=/etc/magina-olivo/staging.env
export BACKUP_DESTINATION_DIR=/mnt/off-host/magina-staging-backups
export BACKUP_DESTINATION_CONFIRMED_OFF_HOST=1
bash scripts/staging-backup.sh
```

El script se niega a continuar sin la confirmación explícita de destino externo.

Cada bundle conserva PostgreSQL, manifiestos, checksums y objetos privados necesarios; no incluye el env file ni credenciales.

## 15. Restore no destructivo

```bash
export STAGING_ENV_FILE=/etc/magina-olivo/staging.env
export RESTORE_BUNDLE_DIR=/mnt/off-host/magina-staging-backups/<bundle>
export RESTORE_DATABASE=magina_restore_validation
export RESTORE_OBJECT_STORAGE_BUCKET=<restore-validation-bucket>
export RESTORE_TARGETS_CONFIRMED_ISOLATED=1
bash scripts/staging-restore-gate.sh
```

El simulacro debe restaurar en una base y bucket aislados, verificar `SHA256SUMS`, comparar manifiestos y volver a descargar/verificar cada objeto restaurado.

## 16. Accesibilidad y PWA/offline manual

Ejecutar los bloques 7 y 8 de `docs/mvp/STAGING_ACCEPTANCE_V1.md` sobre **este mismo SHA**:

- teclado;
- TalkBack/NVDA;
- 200 % zoom/reflow;
- reduced motion;
- foco visible;
- entrega offline;
- labor offline;
- cierre/reapertura sin red;
- modo protegido;
- recuperación de conexión;
- sync única sin duplicados;
- bloqueo/desbloqueo de logout según pendientes.

## 17. Evidencia y criterio PASS

Registrar únicamente evidencia no sensible:

- fecha/hora;
- etiqueta de release;
- **`current_source_sha` completo**;
- PASS/FAIL por gate;
- navegador/SO;
- IDs sintéticos necesarios;
- incidencias + commit correctivo.

No registrar cookies, passwords, tokens, secretos ni datos reales.

Staging externo se marca PASS únicamente cuando se conservan evidencias de:

- host preflight;
- deploy A healthy y SHA trazado;
- aislamiento local de puertos;
- R2 roundtrip real;
- HTTPS válido;
- cookie `Secure` real;
- origin/CSRF bajo proxy;
- recorrido sintético integrado;
- password recovery por correo real;
- deploy B + aislamiento + HTTPS + SHA trazado;
- rollback A + aislamiento + HTTPS + SHA trazado;
- backup realmente fuera del host;
- restore limpio de PostgreSQL + objetos;
- accesibilidad manual;
- PWA/offline manual;
- cero datos personales reales durante las pruebas.

Solo entonces puede cerrarse el issue #7 y plantearse un piloto cerrado con agricultores.

## Referencias

- PR #6 — integración Visual V2 + MVP Core.
- issue #7 — P0 staging real.
- `docs/mvp/STAGING_ACCEPTANCE_V1.md` — criterios de aceptación.
- `docs/spike/STAGING_HOST_GATES.md` — gates del host.
- `docs/INTEGRATION_V2_MVP_V1.md` — contrato de integración.
