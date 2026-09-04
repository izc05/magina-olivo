# Mágina Olivo — MiniPC Bootstrap Commands V1

Hoja auxiliar de comandos para el primer staging real. **No desplegar esta rama.** El código desplegable sigue siendo el SHA V6 exacto `33dda6be7f74d9ffc33761177ed5ca3105bd492d`.

> Ejecutar por bloques y comprobar el resultado antes de continuar. No pegar secretos en el historial si puede evitarse y nunca publicarlos en GitHub/issues/chat.

## A. Información inicial del host

```bash
whoami
uname -a
cat /etc/os-release
df -h
free -h
timedatectl status
```

Recomendación: Ubuntu Server LTS x86_64 en el MiniPC.

## B. Actualizar sistema y utilidades mínimas

```bash
sudo apt update
sudo apt upgrade -y
sudo apt install -y ca-certificates curl git
```

Verificar:

```bash
git --version
curl --version
sha256sum --version | head -n1
findmnt --version | head -n1
```

## C. Instalar Docker Engine + Compose v2 desde repositorio oficial

Comandos basados en la documentación oficial de Docker vigente en septiembre de 2026:

```bash
sudo apt update
sudo apt install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

sudo tee /etc/apt/sources.list.d/docker.sources >/dev/null <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}")
Components: stable
Architectures: $(dpkg --print-architecture)
Signed-By: /etc/apt/keyrings/docker.asc
EOF

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

Comprobar servicio:

```bash
sudo systemctl enable --now docker
sudo systemctl status docker --no-pager
sudo docker run --rm hello-world
sudo docker compose version
```

### Permitir al operador ejecutar Docker sin sudo

Los scripts de staging llaman directamente a `docker`. En un MiniPC dedicado, opción práctica:

```bash
sudo usermod -aG docker "$USER"
```

Cerrar sesión y volver a entrar (o reiniciar) antes de continuar. Después:

```bash
docker info >/dev/null && echo "docker operador: PASS"
docker compose version
```

**Nota de seguridad:** pertenecer al grupo `docker` concede privilegios equivalentes a root sobre el host. Limitarlo a administradores del MiniPC.

Referencia: https://docs.docker.com/engine/install/ubuntu/

## D. Instalar cloudflared desde repositorio oficial Cloudflare

```bash
sudo mkdir -p --mode=0755 /usr/share/keyrings
curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg \
  | sudo tee /usr/share/keyrings/cloudflare-main.gpg >/dev/null

echo "deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared any main" \
  | sudo tee /etc/apt/sources.list.d/cloudflared.list

sudo apt-get update
sudo apt-get install -y cloudflared
cloudflared --version
```

No crear todavía el Tunnel si `deploy-local` no ha dado PASS.

Referencia: https://developers.cloudflare.com/tunnel/advanced/local-management/create-local-tunnel/

## E. Clonar Mágina Olivo

Elegir una ruta local del operador, por ejemplo:

```bash
mkdir -p "$HOME/apps"
cd "$HOME/apps"
git clone https://github.com/izc05/magina-olivo.git
cd magina-olivo
```

Verificar remoto:

```bash
git remote -v
```

## F. Fijar candidato V6 exacto

```bash
git fetch --all --prune
export STAGING_EXPECTED_SOURCE_SHA=33dda6be7f74d9ffc33761177ed5ca3105bd492d
git switch --detach "$STAGING_EXPECTED_SOURCE_SHA"

test "$(git rev-parse HEAD)" = "$STAGING_EXPECTED_SOURCE_SHA" \
  && echo "SHA V6: PASS"

git status --short
```

La última orden no debe imprimir nada.

Opcional para lectura humana:

```bash
git log -1 --oneline --decorate
```

## G. Crear directorio de configuración externa

```bash
sudo mkdir -p /etc/magina-olivo
sudo cp infra/docker/staging.env.example /etc/magina-olivo/staging.env
sudo chown "$USER":"$USER" /etc/magina-olivo/staging.env
chmod 600 /etc/magina-olivo/staging.env
stat -c '%U %G %a %n' /etc/magina-olivo/staging.env
```

Esperado: propietario operador y modo `600`.

Editar sin copiar el contenido a mensajes/capturas:

```bash
nano /etc/magina-olivo/staging.env
```

No ejecutar `source /etc/magina-olivo/staging.env`.

## H. Valores que deben estar preparados antes del preflight

El env debe contener valores reales para:

```text
POSTGRES_PASSWORD
DATABASE_URL
BETTER_AUTH_SECRET
BETTER_AUTH_URL
BETTER_AUTH_TRUSTED_ORIGINS
AEMET_API_KEY
OBJECT_STORAGE_ENDPOINT
OBJECT_STORAGE_BUCKET
OBJECT_STORAGE_ACCESS_KEY_ID
OBJECT_STORAGE_SECRET_ACCESS_KEY
STAGING_BIND=127.0.0.1:8088
```

Para el primer deploy puede dejarse:

```text
AUTH_MAIL_TRANSPORT=disabled
```

El gate de correo real se hará después con `resend`.

## I. Generar secretos locales fuertes

Si `openssl` está disponible:

```bash
openssl rand -base64 36
openssl rand -hex 32
```

Usar valores distintos para `POSTGRES_PASSWORD` y `BETTER_AUTH_SECRET`.

No reutilizar contraseñas personales.

## J. Verificar que el puerto local está libre antes del deploy

```bash
ss -ltnp | grep ':8088' || echo "8088 libre"
```

No abrir manualmente 3001 ni 5432.

## K. Ejecutar estado y preflight

```bash
cd "$HOME/apps/magina-olivo"

export STAGING_EXPECTED_SOURCE_SHA=33dda6be7f74d9ffc33761177ed5ca3105bd492d
export STAGING_ENV_FILE=/etc/magina-olivo/staging.env

bash scripts/staging-acceptance.sh status
bash scripts/staging-acceptance.sh preflight
```

No continuar hasta obtener PASS.

## L. Primer deploy local

```bash
bash scripts/staging-acceptance.sh deploy-local
bash scripts/staging-acceptance.sh status
```

Comprobaciones manuales adicionales:

```bash
curl -i http://127.0.0.1:8088/health/ready
curl -I http://127.0.0.1:8088/
docker compose \
  --env-file /etc/magina-olivo/staging.env \
  -f infra/docker/compose.staging.yml \
  ps
```

El estado debe mostrar:

```text
source_sha=33dda6be7f74d9ffc33761177ed5ca3105bd492d
```

## M. Comprobar puertos publicados

```bash
docker ps --format 'table {{.Names}}\t{{.Ports}}'
```

Esperado:

- web: solo `127.0.0.1:8088->8080/tcp`;
- API: sin host port;
- PostgreSQL: sin host port;
- worker: sin host port.

El gate `deploy-local` ya lo verifica y debe fallar si se rompe esta regla.

## N. Cloudflare Tunnel — después del PASS local

Crear un **remotely-managed tunnel** desde Cloudflare Dashboard y publicar un hostname de staging hacia:

```text
http://127.0.0.1:8088
```

Usar el comando/token que Cloudflare entrega para instalar o ejecutar el conector. El token del Tunnel no debe entrar en Git ni en `staging.env`.

Verificar servicio:

```bash
systemctl status cloudflared --no-pager || true
```

Desde otro dispositivo:

```text
https://<staging-host>/health/ready
```

Debe responder por HTTPS.

## O. Gate externo

Crear previamente una cuenta completamente sintética.

En el shell del operador:

```bash
export STAGING_BASE_URL=https://<staging-host>
export STAGING_GATE_EMAIL=<email-sintetico>
export STAGING_GATE_PASSWORD=<password-sintetico>
```

Si existe Cloudflare Access:

```bash
export CF_ACCESS_CLIENT_ID=<service-token-id>
export CF_ACCESS_CLIENT_SECRET=<service-token-secret>
```

Ejecutar:

```bash
bash scripts/staging-acceptance.sh external
```

Al terminar, limpiar las variables sensibles del shell:

```bash
unset STAGING_GATE_EMAIL STAGING_GATE_PASSWORD CF_ACCESS_CLIENT_ID CF_ACCESS_CLIENT_SECRET
```

## P. Backup off-host

Solo después de montar un destino que sobreviva a la pérdida completa del MiniPC:

```bash
export BACKUP_DESTINATION_DIR=/mnt/off-host/magina-staging-backups
export BACKUP_DESTINATION_CONFIRMED_OFF_HOST=1
bash scripts/staging-acceptance.sh backup
```

Después:

```bash
ls -lah "$BACKUP_DESTINATION_DIR"
```

## Q. Restore aislado

```bash
export RESTORE_BUNDLE_DIR=/mnt/off-host/magina-staging-backups/<bundle>
export RESTORE_DATABASE=magina_restore_validation
export RESTORE_OBJECT_STORAGE_BUCKET=magina-olivo-staging-restore-validation
export RESTORE_TARGETS_CONFIRMED_ISOLATED=1

bash scripts/staging-acceptance.sh restore
```

No usar `magina_olivo` como restore DB ni el bucket activo de staging como restore bucket.

## R. Comandos rápidos de diagnóstico

Estado de Mágina:

```bash
bash scripts/staging-acceptance.sh status
```

Contenedores:

```bash
docker ps -a
```

Uso de disco Docker:

```bash
docker system df
```

Reloj:

```bash
timedatectl status
```

Espacio:

```bash
df -h
```

No copiar logs completos a GitHub si contienen información sensible. Redactar siempre tokens, cookies, emails de pruebas y URLs de recuperación.