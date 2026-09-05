# Mágina Olivo — External staging runbook

Estado: **preparado para ejecución cuando exista host + hostname + credenciales de staging**.

Rama objetivo: `feat/integration-v2-mvp-v1`
Base funcional: `feat/mvp-core-v1`
PR de integración: #6
Gate operativo: issue #7

Este documento aporta detalle operativo. La autoridad sobre orden y criterio PASS es:

1. `docs/mvp/STAGING_ACCEPTANCE_V1.md`;
2. `docs/mvp/STAGING_EXECUTION_V1.md`;
3. issue #7.

Si este documento contradice alguno de ellos, prevalecen los tres anteriores.

No introduce datos reales y no convierte staging en producción.

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
Fastify ---- HTTPS API --------------- AEMET OpenData
Fastify ---- HTTPS API --------------- transactional mail provider
Worker  ----- HTTPS ------------------- RAIF / Observatorio public sources
```

Reglas duras:

- PostgreSQL no publica puerto host.
- Fastify no publica puerto host.
- worker no publica endpoint público.
- Nginx solo enlaza `127.0.0.1:8088`.
- Tunnel es el único camino de entrada desde Internet.
- staging usa solo datos sintéticos y documentos anonimizados.
- el checkout desplegado debe estar limpio y trazado a un SHA Git completo.
- ningún secreto de staging se carga mediante `source` ni se guarda en Git.

## 1. Host

Prerrequisitos mínimos:

- Linux `x86_64`, `aarch64` o `arm64` compatible con las imágenes elegidas;
- Docker Engine + Docker Compose v2;
- Git;
- `curl`, `sha256sum`, `awk`, `grep`, `stat`, `df` y utilidades Linux básicas;
- espacio persistente para PostgreSQL;
- salida a Internet hacia Cloudflare/R2/AEMET/RAIF/Observatorio/proveedor de correo;
- reloj/NTP correcto.

El host no necesita Node/npm para deploy, R2 gate, backup o restore: las utilidades operativas Node viajan dentro de la imagen runtime.

Un host compartido es válido. Otros servicios pueden usar puertos 3001/5432; lo importante es que **los contenedores de Mágina no publiquen esos puertos**.

## 2. Checkout y revisión exacta

```bash
git fetch origin
git switch feat/integration-v2-mvp-v1
git pull --ff-only
git status --short
git rev-parse HEAD
```

`git status --short` debe estar vacío.

`scripts/staging-release.sh` rechaza cualquier deploy desde un working tree con cambios tracked o ficheros no ignorados.

## 3. Env file de staging

Crear fuera del repositorio, por ejemplo:

```text
/etc/magina-olivo/staging.env
```

Permisos:

```bash
sudo chown root:root /etc/magina-olivo/staging.env
sudo chmod 600 /etc/magina-olivo/staging.env
```

Partir de `infra/docker/staging.env.example`.

Variables mínimas:

```dotenv
POSTGRES_PASSWORD=<random-staging-only>
DATABASE_URL=postgres://magina:<password>@postgres:5432/magina_olivo

BETTER_AUTH_SECRET=<random-staging-only>
BETTER_AUTH_URL=https://<staging-hostname>
BETTER_AUTH_TRUSTED_ORIGINS=https://<staging-hostname>

AEMET_API_KEY=<staging-server-side-key>

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

`AUTH_MAIL_TRANSPORT=capture` está prohibido en staging externo.

**No ejecutar `source /etc/magina-olivo/staging.env`.** Compose recibe el fichero directamente y los scripts eliminan del entorno heredado las variables sensibles que podrían pisarlo.

## 4. Preflight del host

```bash
export STAGING_ENV_FILE=/etc/magina-olivo/staging.env
bash scripts/staging-acceptance.sh preflight
```

Comprueba Linux/arquitectura, Docker/Compose, permisos del env file, claves mínimas —incluida AEMET—, HTTPS de Better Auth/R2, trusted origins, loopback, disco y reloj.

No continuar si falla.

## 5. Cloudflare R2 — preparar recursos

Crear dos buckets de staging:

```text
<private-staging-bucket>
<restore-validation-bucket>
```

El primero es almacenamiento privado de la aplicación. El segundo existe únicamente para simulacros de restore y debe estar vacío antes de cada gate.

Las credenciales de staging no deben dar acceso a producción.

## 6. Primer deploy local

Forma recomendada:

```bash
export STAGING_ENV_FILE=/etc/magina-olivo/staging.env
bash scripts/staging-acceptance.sh deploy-local
bash scripts/staging-acceptance.sh status
```

Esta orden ejecuta preflight, build desde checkout limpio, deploy, comprobación de trazabilidad, aislamiento y roundtrip R2.

Estado canónico en disco:

```text
.deploy/staging/current
.deploy/staging/current-source-sha
.deploy/staging/previous
.deploy/staging/previous-source-sha
```

`staging-acceptance.sh status` expone el SHA actual como:

```text
source_sha=<full-git-sha>
```

Ese SHA debe coincidir con `git rev-parse HEAD`.

Todavía **no conectar Cloudflare Tunnel** si `deploy-local` no termina en PASS.

## 7. Gate de aislamiento local

`deploy-local` ya ejecuta `scripts/staging-host-postdeploy-gate.sh`, que debe demostrar:

- PostgreSQL/API healthy;
- worker/web running;
- PostgreSQL sin host ports;
- API sin host ports;
- worker sin host ports;
- Nginx únicamente en loopback;
- health 200 por Nginx local;
- raíz PWA 200 por la misma entrada.

## 8. Gate R2 real

`deploy-local` también ejecuta `scripts/staging-r2-gate.sh`:

```text
PUT -> GET -> SHA-256 -> DELETE -> GET must fail
```

Debe terminar en PASS sin copiar credenciales R2 al shell interactivo.

## 9. Cloudflare Tunnel

Usar preferentemente un Tunnel gestionado remotamente.

Publicar un único hostname hacia:

```text
http://127.0.0.1:8088
```

El token del Tunnel es secreto y nunca entra en Git ni en el env de la aplicación.

Si staging no debe quedar públicamente accesible, proteger el hostname con Cloudflare Access y usar una cuenta/service token específico para los gates automatizados.

## 10. Cuenta sintética para gate externo

Antes de `external`, preparar una cuenta exclusivamente sintética. No reutilizar credenciales personales ni de producción.

Variables requeridas:

```bash
export STAGING_BASE_URL=https://<staging-hostname>
export STAGING_GATE_EMAIL=<synthetic-email>
export STAGING_GATE_PASSWORD=<synthetic-password>
```

Si Cloudflare Access protege el hostname:

```bash
export CF_ACCESS_CLIENT_ID=<service-token-client-id>
export CF_ACCESS_CLIENT_SECRET=<service-token-client-secret>
```

Nunca registrar estos valores en issues, PR, chat ni documentos de evidencia.

## 11. Gate externo agregado

Ejecutar:

```bash
bash scripts/staging-acceptance.sh external
```

Debe pasar, sobre el mismo hostname y revisión:

### HTTPS / seguridad

- TLS válido;
- `/health/ready` 200;
- PWA accesible;
- HSTS;
- login válido;
- cookie `HttpOnly`, `Secure`, `SameSite=Lax`;
- API privada `no-store`;
- origen hostil rechazado;
- logout y sesión invalidada.

### Recorrido agrícola privado

- dos usuarios aislados;
- explotación -> finca -> parcela -> campaña;
- entrega 1.842 kg + idempotencia;
- rendimiento 21,9 %;
- labor de poda + replay retry-safe;
- timeline/resumen;
- ticket privado con roundtrip exacto;
- bloqueo de acceso cruzado.

### Mágina pública

- `/magina`;
- Tiempo/AEMET;
- Campo/RAIF;
- Noticias verificadas;
- Mercado;
- Directorio de cooperativas/almazaras;
- procedencia/frescura/URLs HTTPS;
- separación explícita entre contexto público y datos privados.

El municipio AEMET por defecto es `bedmar-y-garciez` y puede cambiarse con `STAGING_PUBLIC_WEATHER_MUNICIPALITY` usando únicamente un slug verificado.

## 12. Password recovery real

Para la prueba real:

1. verificar dominio/remitente de staging en el proveedor de correo;
2. editar el env file: `AUTH_MAIL_TRANSPORT=resend`;
3. mantener `AUTH_MAIL_FROM` entre comillas si contiene espacios;
4. añadir `RESEND_API_KEY` staging-only;
5. desplegar una nueva release/configuración;
6. repetir postdeploy y gate externo;
7. solicitar reset para una cuenta sintética;
8. confirmar recepción real;
9. completar reset;
10. comprobar sesiones antiguas inválidas y token no reutilizable;
11. comprobar ausencia de token/URL sensible en logs.

## 13. Deploy B y rollback A

El lifecycle ya está cubierto por CI, pero debe observarse también en el entorno real antes del piloto si se cambia de revisión durante staging.

```bash
bash scripts/staging-release.sh deploy staging-b
bash scripts/staging-host-postdeploy-gate.sh
bash scripts/staging-release.sh status
```

Después:

```bash
bash scripts/staging-release.sh rollback
bash scripts/staging-host-postdeploy-gate.sh
bash scripts/staging-release.sh status
```

El rollback recupera etiqueta y SHA de origen desde la imagen. Repetir el gate externo si el hostname ya está publicado.

No usar migraciones destructivas durante el piloto. Las migraciones deben mantenerse aditivas/backward-compatible para que rollback de código sea seguro.

## 14. Backup fuera del host

```bash
export STAGING_ENV_FILE=/etc/magina-olivo/staging.env
export BACKUP_DESTINATION_DIR=/mnt/off-host/magina-staging-backups
export BACKUP_DESTINATION_CONFIRMED_OFF_HOST=1
bash scripts/staging-acceptance.sh backup
```

Cada bundle conserva:

- PostgreSQL;
- manifiesto relacional;
- objetos privados;
- `SHA256SUMS`;
- etiqueta de release;
- **`application_source_sha`**, el SHA Git exacto que produjo la copia.

No incluye env file ni credenciales.

## 15. Restore no destructivo

```bash
export STAGING_ENV_FILE=/etc/magina-olivo/staging.env
export RESTORE_BUNDLE_DIR=/mnt/off-host/magina-staging-backups/<bundle>
export RESTORE_DATABASE=magina_restore_validation
export RESTORE_OBJECT_STORAGE_BUCKET=<restore-validation-bucket>
export RESTORE_TARGETS_CONFIRMED_ISOLATED=1
bash scripts/staging-acceptance.sh restore
```

El simulacro debe:

- rechazar un bundle sin `application_source_sha` válido;
- verificar `SHA256SUMS`;
- restaurar en DB/bucket aislados;
- comparar manifiesto relacional;
- volver a descargar/verificar objetos privados.

## 16. Accesibilidad manual — bloque 8

Ejecutar `docs/mvp/ACCESSIBILITY_GATE_V1.md` sobre **el mismo SHA**:

- teclado;
- TalkBack/NVDA;
- 200 % zoom/reflow;
- reduced motion;
- foco visible;
- navegación activa anunciada;
- adjunto de ticket operable sin ratón.

## 17. PWA/offline manual — bloque 9

Con usuario sintético y la misma revisión:

- instalar/abrir PWA;
- iniciar sesión online;
- cortar red;
- crear entrega y labor compatibles con offline;
- confirmar pendientes visibles;
- cerrar/reabrir sin red;
- confirmar `Modo protegido` y conservación de outbox;
- recuperar red;
- revalidar sesión;
- sincronizar/reintentar;
- confirmar una sola entrega y una sola labor;
- confirmar timeline actualizado;
- confirmar bloqueo/desbloqueo de logout según pendientes;
- confirmar que un error de sync no borra operaciones;
- confirmar que tickets privados no se prometen como guardados offline antes de subida real.

## 18. Evidencia y criterio PASS

Registrar únicamente evidencia no sensible:

- fecha/hora;
- etiqueta de release;
- **`source_sha` completo mostrado por `staging-acceptance.sh status`**;
- PASS/FAIL por gate;
- navegador/SO;
- municipio AEMET usado;
- IDs sintéticos necesarios;
- incidencias + commit correctivo.

No registrar cookies, passwords, tokens, secretos ni datos reales.

Staging externo se marca PASS solo cuando los **nueve bloques** del issue #7 estén verdes sobre la misma revisión:

1. host/contenedores;
2. HTTPS/seguridad;
3. recorrido privado sintético;
4. Mágina pública/fuentes;
5. almacenamiento privado;
6. correo/reset;
7. backup/restore;
8. accesibilidad manual;
9. PWA/offline manual.

Solo entonces puede cerrarse el issue #7 y plantearse un piloto cerrado con 2–5 olivareros usando cuentas y datos sintéticos o documentos anonimizados.

## Referencias

- PR #6 — integración Visual V2 + MVP Core.
- issue #7 — P0 staging real.
- `docs/mvp/STAGING_ACCEPTANCE_V1.md` — criterio de aceptación.
- `docs/mvp/STAGING_EXECUTION_V1.md` — secuencia operativa principal.
- `docs/spike/STAGING_HOST_GATES.md` — gates del host.
- `docs/INTEGRATION_V2_MVP_V1.md` — contrato de integración.
