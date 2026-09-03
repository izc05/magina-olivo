# Mágina Olivo — Raspberry Pi staging V1

Estado: **preparado para ejecutar cuando exista Raspberry + disco externo**.

Este documento complementa `STAGING_EXECUTION_V1.md`. No sustituye los nueve bloques de aceptación.

## Objetivo

Usar una Raspberry Pi 4 como host de staging de Mágina Olivo sin dejar la base PostgreSQL sobre la microSD.

Arquitecturas admitidas por el preflight:

- `aarch64`;
- `arm64`;
- `x86_64` para otros hosts.

## Almacenamiento recomendado

Para PostgreSQL usar un SSD/USB externo con sistema de archivos Linux, preferentemente `ext4`.

No usar para el directorio activo de PostgreSQL:

- FAT/VFAT;
- exFAT;
- NTFS;
- un directorio que siga perteneciendo al mismo filesystem raíz/microSD cuando `STAGING_REQUIRE_EXTERNAL_DATA=1`.

El disco puede tener más usos, pero Mágina debe disponer de una ruta dedicada, por ejemplo:

```text
/srv/magina-data/postgres
```

## Montaje persistente

El disco debe montarse por UUID o equivalente estable, no depender de `/dev/sda1`.

Ejemplo conceptual:

```text
UUID=<uuid-del-disco>  /srv/magina-data  ext4  defaults,noatime  0  2
```

La línea real de `/etc/fstab` se generará únicamente después de identificar el disco y confirmar su UUID.

Antes de tocar particiones o formatear hay que comprobar que el disco elegido no contiene datos necesarios.

## Directorio PostgreSQL

Una vez montado el disco:

```bash
sudo mkdir -p /srv/magina-data/postgres
```

Los permisos/UID se ajustarán contra la imagen PostgreSQL que vayamos a ejecutar. No asumir un UID fijo sin comprobarlo.

## Variables de staging

En `/etc/magina-olivo/staging.env`:

```dotenv
MAGINA_POSTGRES_DATA_DIR=/srv/magina-data/postgres
STAGING_REQUIRE_EXTERNAL_DATA=1
```

Con esta combinación:

- Compose usa bind mount hacia el disco externo;
- `staging-host-preflight.sh` exige ruta absoluta existente y escribible;
- comprueba mediante `findmnt` que la ruta no está en el mismo filesystem que `/`;
- rechaza FAT/exFAT/NTFS para PostgreSQL;
- comprueba espacio libre sobre el disco de datos, no sobre el checkout;
- muestra memoria total como señal operativa.

Si estas variables no se configuran, staging conserva el volumen Docker estándar. Ese modo sirve para CI/otros hosts, pero **no es el modo previsto para la Raspberry de Mágina**.

## Secuencia el día del montaje

1. Identificar Raspberry, arquitectura, RAM y estado de Docker.
2. Identificar el disco externo con `lsblk`/`blkid`.
3. Confirmar que no contiene datos necesarios.
4. Preparar partición y `ext4` si procede.
5. Montar de forma persistente.
6. Crear `/srv/magina-data/postgres` y ajustar permisos contra la imagen PostgreSQL.
7. Crear `/etc/magina-olivo/staging.env` con modo `0600`.
8. Configurar `MAGINA_POSTGRES_DATA_DIR` y `STAGING_REQUIRE_EXTERNAL_DATA=1`.
9. Ejecutar:

```bash
export STAGING_ENV_FILE=/etc/magina-olivo/staging.env
bash scripts/staging-acceptance.sh preflight
```

10. No desplegar si el preflight no confirma almacenamiento externo.
11. Continuar con `deploy-local` y los nueve bloques normales de staging.

## MicroSD

La Raspberry puede seguir arrancando inicialmente desde microSD. La condición importante para el primer staging es que **PostgreSQL no escriba sus datos activos en ella**.

Más adelante se puede valorar arrancar todo el sistema desde SSD, pero no es requisito para validar Mágina V1.

## Backups

El mismo SSD que contiene PostgreSQL **no cuenta como backup off-host**.

El bloque de backup/restore seguirá necesitando un destino independiente del host/disco activo: otro equipo, NAS, segundo medio o destino remoto controlado.

## Seguridad

- no guardar secretos en el repositorio;
- no publicar PostgreSQL ni Fastify directamente;
- solo Nginx escucha en `127.0.0.1:8088`;
- Cloudflare Tunnel será la única entrada externa;
- usar datos sintéticos hasta cerrar los nueve bloques de staging.
