# Mágina Olivo — MiniPC Día 0 / Staging V6

Estado: **guía operativa auxiliar; NO forma parte del candidato desplegable**.

Esta guía existe para preparar y ejecutar el primer staging real sin modificar el candidato congelado.

## Autoridad y revisión exacta

Candidato oficial:

- rama de referencia: `staging/candidate-v6-2026-09-04`
- SHA obligatorio: `33dda6be7f74d9ffc33761177ed5ca3105bd492d`
- MVP Core Smoke #436: PASS
- Technical Spike Smoke #326: PASS

El despliegue debe realizarse desde **ese SHA exacto en detached HEAD**. No desplegar desde `main`, `feat/integration-*`, esta rama documental ni otra rama móvil.

```bash
git fetch --all --prune
export STAGING_EXPECTED_SOURCE_SHA=33dda6be7f74d9ffc33761177ed5ca3105bd492d
git switch --detach "$STAGING_EXPECTED_SOURCE_SHA"
test "$(git rev-parse HEAD)" = "$STAGING_EXPECTED_SOURCE_SHA"
git status --short
```

`git status --short` debe quedar vacío.

---

## 1. Decisiones cerradas antes de sentarnos delante del MiniPC

### Sistema

Recomendado para el primer staging: **Ubuntu Server LTS x86_64** en el MiniPC.

Necesario:

- Docker Engine;
- Docker Compose v2;
- Git;
- `curl`, `sha256sum`, `awk`, `grep`, `stat`, `df`;
- reloj/NTP correcto;
- salida a Internet;
- al menos 5 GiB libres en el almacenamiento usado por PostgreSQL;
- al menos 2 GiB RAM; más memoria facilitará los builds.

Verificación básica:

```bash
uname -a
timedatectl status
df -h
docker version
docker compose version
git --version
```

### Docker

Usar la instalación oficial desde el repositorio APT de Docker. No abrir manualmente 3001 ni 5432 en el firewall.

Importante: Docker puede publicar puertos saltándose algunas reglas de `ufw`; en Mágina Olivo el Compose de V6 no publica PostgreSQL/API/worker y el gate postdeploy lo comprueba. Solo Nginx debe quedar en `127.0.0.1:8088`.

Referencia oficial actual:

- https://docs.docker.com/engine/install/ubuntu/

---

## 2. Recursos externos que deben existir

Preparar antes del PASS completo:

1. hostname de staging bajo un dominio gestionado por Cloudflare;
2. Cloudflare Tunnel remoto;
3. dos buckets R2 privados;
4. credenciales R2 S3 con lectura/escritura limitada a esos buckets;
5. API Key de AEMET OpenData dedicada;
6. remitente de correo de staging y API key de Resend para el gate de recuperación;
7. destino de backup realmente fuera del host.

### Nombres recomendados

Ejemplo temporal:

```text
staging-magina.<dominio-controlado>
magina-olivo-staging-private
magina-olivo-staging-restore-validation
```

No usar los buckets de futura producción.

---

## 3. Cloudflare R2

Crear dos buckets privados:

```text
magina-olivo-staging-private
magina-olivo-staging-restore-validation
```

Los buckets R2 son privados por defecto. No habilitar `Public Development URL` ni dominio público para estos buckets.

Crear un token S3 con **Object Read & Write** limitado exclusivamente a los dos buckets de staging. Guardar una única vez:

- Access Key ID;
- Secret Access Key;
- endpoint S3 `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`.

El mismo conjunto de credenciales debe poder escribir tanto en el bucket activo como en el bucket aislado de restore, porque `staging-restore-gate.sh` reutiliza las credenciales del contenedor y sustituye únicamente el nombre de bucket.

Referencias oficiales actuales:

- https://developers.cloudflare.com/r2/get-started/s3/
- https://developers.cloudflare.com/r2/api/tokens/

---

## 4. AEMET OpenData

Crear una API Key dedicada al staging desde:

- https://opendata.aemet.es/centrodedescargas/obtencionAPIKey

AEMET indica actualmente que las claves antiguas que eran indefinidas caducan el **15 de octubre de 2026**. Para evitar que el piloto dependa de una clave antigua, usar una clave generada específicamente para Mágina Olivo staging y documentar solo la fecha de creación, nunca la clave.

La clave debe existir únicamente en `/etc/magina-olivo/staging.env` y nunca en `VITE_*`, GitHub, issues o capturas.

---

## 5. Correo de recuperación

Proveedor previsto en V6: Resend.

Recomendado:

- verificar un subdominio de envío, por ejemplo `mail.<dominio>` o `staging-mail.<dominio>`;
- configurar SPF y DKIM;
- crear una API key `Sending access` limitada a ese dominio cuando sea posible;
- guardar la API key solo en el env externo;
- mantener `AUTH_MAIL_TRANSPORT=disabled` hasta llegar al bloque 6 del gate si el dominio todavía no está verificado.

Referencias oficiales actuales:

- https://resend.com/docs/dashboard/domains/introduction
- https://resend.com/docs/dashboard/api-keys/introduction

---

## 6. Cloudflare Tunnel

Cloudflare recomienda actualmente un **remotely-managed tunnel** para la mayoría de casos.

Publicar un solo hostname hacia:

```text
http://127.0.0.1:8088
```

No apuntar directamente a API ni PostgreSQL.

Requisitos:

- dominio activo en Cloudflare;
- MiniPC con salida a Internet;
- `cloudflared` instalado o ejecutado como servicio/contenedor;
- si el hostname queda protegido por Cloudflare Access, crear service token específico para los gates.

No guardar el Tunnel token ni los tokens de Access dentro del repo o del env de la aplicación.

Referencias oficiales actuales:

- https://developers.cloudflare.com/tunnel/setup/
- https://developers.cloudflare.com/tunnel/advanced/local-management/

---

## 7. Fichero de secretos

Crear:

```text
/etc/magina-olivo/staging.env
```

Partir de `infra/docker/staging.env.example` del candidato V6.

Regla de permisos: el preflight exige que el fichero no tenga permisos de grupo/otros. **No exige que sea propiedad de root.** El usuario que ejecute los scripts debe poder leerlo.

Ejemplo si el operador será el usuario actual:

```bash
sudo mkdir -p /etc/magina-olivo
sudo cp infra/docker/staging.env.example /etc/magina-olivo/staging.env
sudo chown "$USER":"$USER" /etc/magina-olivo/staging.env
chmod 600 /etc/magina-olivo/staging.env
```

Alternativa: mantener `root:root 600` y ejecutar de forma coherente los comandos que deban leer el fichero con privilegios. No mezclar ambos modelos a mitad de la ejecución.

Variables mínimas del primer deploy:

```dotenv
POSTGRES_PASSWORD=<secreto-largo-staging>
DATABASE_URL=postgres://magina:<mismo-password>@postgres:5432/magina_olivo

BETTER_AUTH_SECRET=<secreto-aleatorio-fuerte>
BETTER_AUTH_URL=https://<staging-host>
BETTER_AUTH_TRUSTED_ORIGINS=https://<staging-host>

AEMET_API_KEY=<clave-dedicada-staging>

AUTH_MAIL_TRANSPORT=disabled
AUTH_MAIL_FROM="Mágina Olivo <no-reply@<dominio-verificado>>"
RESEND_API_KEY=

PRIVATE_STORAGE_DRIVER=s3
OBJECT_STORAGE_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
OBJECT_STORAGE_BUCKET=magina-olivo-staging-private
OBJECT_STORAGE_REGION=auto
OBJECT_STORAGE_ACCESS_KEY_ID=<staging-only>
OBJECT_STORAGE_SECRET_ACCESS_KEY=<staging-only>
OBJECT_STORAGE_FORCE_PATH_STYLE=true

STAGING_BIND=127.0.0.1:8088
LOG_LEVEL=info
```

No ejecutar `source /etc/magina-olivo/staging.env`.

---

## 8. PostgreSQL: volumen o disco externo

### MiniPC con SSD interno

Para el primer staging puede utilizarse el volumen Docker nombrado si el SSD interno es fiable y hay backup off-host real. Mantener:

```dotenv
MAGINA_POSTGRES_DATA_DIR=
STAGING_REQUIRE_EXTERNAL_DATA=0
```

### Raspberry Pi / almacenamiento externo

Si finalmente se usa Raspberry Pi, PostgreSQL debe quedar en SSD/USB con filesystem Linux (recomendado ext4), no en microSD.

Ejemplo:

```dotenv
MAGINA_POSTGRES_DATA_DIR=/srv/magina-olivo/postgres
STAGING_REQUIRE_EXTERNAL_DATA=1
```

El preflight rechazará una ruta que siga en el mismo filesystem raíz o use FAT/exFAT/NTFS.

---

## 9. Primer preflight

Desde detached HEAD V6:

```bash
export STAGING_EXPECTED_SOURCE_SHA=33dda6be7f74d9ffc33761177ed5ca3105bd492d
export STAGING_ENV_FILE=/etc/magina-olivo/staging.env

bash scripts/staging-acceptance.sh status
bash scripts/staging-acceptance.sh preflight
```

No continuar si falla.

El preflight comprueba:

- SHA exacto;
- Linux/arquitectura;
- Docker/Compose;
- permisos del env;
- variables mínimas;
- Better Auth HTTPS + trusted origin;
- R2 HTTPS;
- AEMET server-side;
- bind loopback;
- espacio disponible;
- memoria;
- NTP;
- almacenamiento externo cuando se exija.

---

## 10. Primer deploy local

Solo después de `preflight PASS`:

```bash
bash scripts/staging-acceptance.sh deploy-local
bash scripts/staging-acceptance.sh status
```

Debe terminar con:

- PostgreSQL healthy;
- API healthy;
- worker running;
- web running;
- PostgreSQL/API/worker sin puertos publicados;
- web solo en `127.0.0.1:8088`;
- raíz PWA 200;
- health 200;
- R2 `PUT -> GET -> SHA-256 -> DELETE` PASS;
- `source_sha=33dda6be7f74d9ffc33761177ed5ca3105bd492d`.

Antes de configurar Tunnel se puede comprobar localmente:

```bash
curl -i http://127.0.0.1:8088/health/ready
curl -I http://127.0.0.1:8088/
```

---

## 11. Gate externo

Cuando Tunnel y hostname estén operativos:

```bash
export STAGING_BASE_URL=https://<staging-host>
export STAGING_GATE_EMAIL=<cuenta-sintetica>
export STAGING_GATE_PASSWORD=<password-sintetico>

# Solo si usamos Cloudflare Access:
export CF_ACCESS_CLIENT_ID=<service-token-id>
export CF_ACCESS_CLIENT_SECRET=<service-token-secret>

bash scripts/staging-acceptance.sh external
```

Ese comando cubre sobre el mismo hostname:

1. HTTPS/seguridad;
2. recorrido privado sintético;
3. Mágina pública.

No guardar las credenciales sintéticas en evidencia, issue o chat.

---

## 12. Backup off-host

El destino debe estar físicamente fuera del MiniPC: NAS, otro servidor, unidad montada desde otro sistema o almacenamiento equivalente que sobreviva a pérdida completa del host.

No cuenta como off-host otra carpeta del mismo SSD.

```bash
export BACKUP_DESTINATION_DIR=/mnt/off-host/magina-staging-backups
export BACKUP_DESTINATION_CONFIRMED_OFF_HOST=1
bash scripts/staging-acceptance.sh backup
```

El bundle contiene:

- `pg_dump -Fc`;
- manifiesto relacional;
- copia de objetos privados;
- SHA Git origen;
- checksums independientes.

---

## 13. Restore aislado

Preparar un bucket vacío de restore-validation y una DB distinta de `magina_olivo`.

```bash
export RESTORE_BUNDLE_DIR=/mnt/off-host/magina-staging-backups/<bundle>
export RESTORE_DATABASE=magina_restore_validation
export RESTORE_OBJECT_STORAGE_BUCKET=magina-olivo-staging-restore-validation
export RESTORE_TARGETS_CONFIRMED_ISOLATED=1
bash scripts/staging-acceptance.sh restore
```

El script impide usar la DB activa o el bucket activo por error.

---

## 14. Orden exacto del día de instalación

1. actualizar Ubuntu y confirmar reloj;
2. instalar/verificar Docker Engine + Compose v2;
3. clonar repositorio;
4. cambiar a detached HEAD V6 exacto;
5. preparar `/etc/magina-olivo/staging.env`;
6. ejecutar `status`;
7. ejecutar `preflight`;
8. corregir únicamente problemas del host/configuración;
9. ejecutar `deploy-local`;
10. verificar `source_sha` exacto;
11. crear/conectar Cloudflare Tunnel a `127.0.0.1:8088`;
12. crear cuenta sintética;
13. ejecutar `external`;
14. habilitar y probar correo real;
15. ejecutar backup off-host;
16. ejecutar restore aislado;
17. completar accesibilidad manual;
18. completar PWA/offline manual;
19. registrar PASS/FAIL de los nueve bloques en issue #7;
20. no introducir datos reales hasta cerrar #7 en PASS.

---

## 15. Qué NO hacer

- no mover ni reescribir `staging/candidate-v6-2026-09-04`;
- no desplegar `main` ni ramas post-staging;
- no poner secretos en GitHub, issues, capturas o chat;
- no publicar 3001/5432;
- no hacer público el bucket R2;
- no usar datos reales de agricultores;
- no llamar PASS a backup sin restore;
- no llamar PASS al staging por el simple hecho de que cargue la página;
- no mezclar publicidad, recompensas u otras ramas posteriores dentro de V6.

## Criterio final

El primer staging queda aceptado únicamente cuando issue #7 tenga PASS para los nueve bloques sobre el mismo SHA V6 y exista evidencia mínima sin secretos.