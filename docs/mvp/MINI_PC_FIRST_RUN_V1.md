# Mágina Olivo — Mini-PC First Run V1

Estado: **guía operativa previa a staging real**.

Objetivo: reducir el montaje del primer Mini-PC a una secuencia corta y segura, sin sustituir los gates de staging ni modificar el candidato congelado.

Autoridad operativa:
1. `docs/mvp/STAGING_ACCEPTANCE_V1.md`;
2. `docs/mvp/STAGING_EXECUTION_V1.md`;
3. issue #7;
4. issue del candidato de staging vigente.

Si esta guía contradice cualquiera de los anteriores, prevalecen los documentos/gates de autoridad.

## Regla principal

**No desplegar formalmente desde `feat/integration-v2-mvp-v1`, `main` ni otra rama móvil.**

Para staging formal se usa siempre el SHA exacto del candidato aprobado, en `detached HEAD`, y se fija:

```bash
export STAGING_EXPECTED_SOURCE_SHA=<sha-aprobado-de-40-caracteres>
```

La rama de integración puede seguir usándose para desarrollo y preview, pero no cuenta como aceptación real.

## 1. Primer encendido del Mini-PC

En el repositorio, ejecutar primero el diagnóstico sin secretos:

```bash
bash scripts/mini-pc-readiness.sh
```

Este script:
- no instala paquetes;
- no usa sudo;
- no crea usuarios;
- no abre puertos;
- no toca Docker ni contenedores;
- no lee el fichero de secretos;
- solo verifica Linux, arquitectura, Git, Docker/Compose, disco, memoria, NTP, puerto 8088 y estado del checkout.

Resultado esperado:

```text
READY FOR CONFIGURATION
```

Si aparecen `FAIL`, corregirlos antes de crear el env de staging.

Los `WARN` no siempre bloquean, pero deben revisarse antes del gate correspondiente.

## 2. Preparar el repositorio

Si todavía no existe el checkout:

```bash
git clone https://github.com/izc05/magina-olivo.git
cd magina-olivo
git fetch --all --prune
```

Consultar el issue del candidato de staging vigente y copiar su SHA completo.

Después:

```bash
export STAGING_EXPECTED_SOURCE_SHA=<sha-aprobado-de-40-caracteres>
git switch --detach "$STAGING_EXPECTED_SOURCE_SHA"

test "$(git rev-parse HEAD)" = "$STAGING_EXPECTED_SOURCE_SHA"
git status --short
```

`git status --short` debe quedar vacío.

Opcionalmente repetir:

```bash
bash scripts/mini-pc-readiness.sh
```

Con `STAGING_EXPECTED_SOURCE_SHA` definido, el script avisará si el checkout no coincide con el candidato aprobado.

## 3. Crear el fichero de staging fuera de Git

Ruta recomendada:

```text
/etc/magina-olivo/staging.env
```

Crear directorio y fichero:

```bash
sudo install -d -m 700 /etc/magina-olivo
sudo cp infra/docker/staging.env.example /etc/magina-olivo/staging.env
sudo chmod 600 /etc/magina-olivo/staging.env
```

Editar únicamente fuera del repositorio:

```bash
sudo nano /etc/magina-olivo/staging.env
```

No copiar valores reales a issues, PR, capturas ni chat.

**No ejecutar `source /etc/magina-olivo/staging.env`.**

Los scripts y Compose leen el fichero de forma controlada.

## 4. Variables que deben estar preparadas antes del preflight

Mínimo:

- `POSTGRES_PASSWORD`;
- `DATABASE_URL`;
- `BETTER_AUTH_SECRET`;
- `BETTER_AUTH_URL`;
- `BETTER_AUTH_TRUSTED_ORIGINS`;
- `AEMET_API_KEY`;
- `PRIVATE_STORAGE_DRIVER=s3`;
- endpoint/bucket/credenciales R2/S3 de staging;
- `STAGING_BIND=127.0.0.1:8088`.

Para el primer deploy puede permanecer:

```dotenv
AUTH_MAIL_TRANSPORT=disabled
```

El correo real se activa después, en su gate específico.

### Mini-PC con SSD interno

Puede mantenerse el volumen Docker por defecto si el disco del sistema es el almacenamiento persistente previsto.

### Raspberry Pi / disco externo obligatorio

Usar un disco USB/SSD con filesystem Linux, por ejemplo ext4:

```dotenv
MAGINA_POSTGRES_DATA_DIR=/srv/magina-olivo/postgres
STAGING_REQUIRE_EXTERNAL_DATA=1
```

El preflight rechazará que PostgreSQL termine accidentalmente en microSD/root cuando `STAGING_REQUIRE_EXTERNAL_DATA=1`.

## 5. Preflight formal

```bash
export STAGING_ENV_FILE=/etc/magina-olivo/staging.env
export STAGING_EXPECTED_SOURCE_SHA=<sha-aprobado-de-40-caracteres>

bash scripts/staging-acceptance.sh preflight
```

Debe comprobar:
- SHA exacto aprobado;
- Linux y arquitectura;
- Docker y Compose v2;
- permisos seguros del env;
- AEMET server-side;
- Better Auth HTTPS y trusted origins;
- R2/S3 HTTPS;
- bind loopback;
- disco y memoria;
- NTP/reloj;
- almacenamiento externo cuando se exige.

No continuar si falla.

## 6. Primer deploy local

```bash
bash scripts/staging-acceptance.sh deploy-local
bash scripts/staging-acceptance.sh status
```

El deploy local debe terminar en PASS para:
- build desde checkout limpio;
- release trazable;
- SHA desplegado = SHA aprobado;
- PostgreSQL/API/worker sin puertos públicos;
- web únicamente en loopback;
- health local;
- roundtrip real del bucket privado.

Comprobar especialmente:

```text
expected_source_sha=<sha aprobado>
checkout_source_sha=<mismo sha>
source_sha=<mismo sha>
```

No configurar el Tunnel si `deploy-local` no termina en PASS.

## 7. Publicar staging mediante Cloudflare Tunnel

El único origen local publicado debe ser:

```text
http://127.0.0.1:8088
```

Nunca publicar directamente:
- PostgreSQL;
- Fastify/API;
- worker;
- puertos internos de Docker.

El token del Tunnel no entra en el env de la aplicación ni en Git.

Si se usa Cloudflare Access, preparar un service token de staging para los gates externos.

## 8. Gate externo

Con el hostname HTTPS ya operativo:

```bash
export STAGING_BASE_URL=https://<staging-hostname>
export STAGING_GATE_EMAIL=<cuenta-sintetica>
export STAGING_GATE_PASSWORD=<password-sintetico>

bash scripts/staging-acceptance.sh external
```

Debe validar sobre el mismo hostname:
- HTTPS/HSTS/cookies/sesión;
- recorrido agrícola privado sintético;
- aislamiento entre usuarios;
- páginas públicas de Mágina;
- AEMET/RAIF/noticias/mercado/directorio según el contrato del candidato desplegado.

No usar usuarios ni documentos reales.

## 9. Bloques que siguen siendo manuales

Aunque `external` pase, staging aún no está completo. Faltan:

1. correo/reset real;
2. backup fuera del host;
3. restore aislado;
4. accesibilidad manual;
5. PWA/offline manual.

El issue #7 solo se cierra cuando los nueve bloques completos estén en PASS sobre la misma revisión.

## 10. Secuencia corta para el día del montaje

```bash
# A. Diagnóstico del equipo
bash scripts/mini-pc-readiness.sh

# B. Resolver candidato aprobado
git fetch --all --prune
export STAGING_EXPECTED_SOURCE_SHA=<sha-aprobado>
git switch --detach "$STAGING_EXPECTED_SOURCE_SHA"
git status --short

# C. Preparar env fuera de Git
export STAGING_ENV_FILE=/etc/magina-olivo/staging.env

# D. Gate previo
bash scripts/staging-acceptance.sh preflight

# E. Deploy solo local
bash scripts/staging-acceptance.sh deploy-local
bash scripts/staging-acceptance.sh status

# F. Solo si todo lo anterior está en PASS:
# configurar Cloudflare Tunnel -> http://127.0.0.1:8088

# G. Gate externo
export STAGING_BASE_URL=https://<staging-hostname>
export STAGING_GATE_EMAIL=<synthetic-email>
export STAGING_GATE_PASSWORD=<synthetic-password>
bash scripts/staging-acceptance.sh external
```

## 11. Condiciones de parada inmediata

No seguir si ocurre cualquiera de estas situaciones:
- checkout distinto del SHA aprobado;
- working tree sucio;
- env file legible por grupo/otros;
- `STAGING_BIND` no está en loopback;
- AEMET o almacenamiento privado no están configurados;
- PostgreSQL/API aparecen publicados al host;
- `source_sha` desplegado no coincide con el candidato;
- el bucket de staging es público;
- se usan datos reales antes de completar aceptación.

## 12. Sobre las funciones nuevas de integración

La rama de integración puede contener funciones posteriores al candidato de staging vigente, por ejemplo mejoras visuales o meteorológicas.

Eso **no autoriza a incorporarlas al staging formal actual**.

Si decidimos que una mejora posterior debe formar parte del primer piloto, la secuencia correcta es:

1. completar o invalidar conscientemente el freeze vigente;
2. crear un candidato nuevo desde una revisión concreta;
3. fijar su SHA completo;
4. repetir MVP Core + Technical Spike;
5. ejecutar staging real completo sobre ese nuevo candidato.

Nunca modificar el candidato congelado existente.
