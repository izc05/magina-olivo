# Mágina Olivo — Staging host gates

Estado: **preflight preparado; post-deploy aislamiento probado también en CI**.

Estos gates se ejecutan en el host antes de conectar Cloudflare Tunnel. Su objetivo es impedir que un error de instalación convierta PostgreSQL o Fastify en servicios expuestos directamente a la red.

## 1. Preflight antes del primer deploy

Configurar primero el env file de staging fuera del repositorio:

```bash
export STAGING_ENV_FILE=/etc/magina-olivo/staging.env
```

No hacer `source` del fichero de secretos.

Ejecutar:

```bash
bash scripts/staging-host-preflight.sh
```

El preflight exige:

- Linux `x86_64`, `aarch64` o `arm64`;
- Docker accesible por el operador;
- Docker Compose v2;
- Git, curl y utilidades básicas presentes;
- env file existente y sin permisos de grupo/otros;
- claves críticas presentes sin imprimir sus valores;
- `BETTER_AUTH_URL` HTTPS;
- `BETTER_AUTH_TRUSTED_ORIGINS` incluyendo el origen de Better Auth;
- endpoint de object storage HTTPS;
- `STAGING_BIND` en loopback;
- `capture` de correo prohibido en staging externo;
- si el transporte es `resend`, remitente y API key presentes;
- espacio libre mínimo, por defecto 5 GiB;
- advertencia si el host no confirma NTP sincronizado.

Un host compartido es válido. Si otro servicio ya escucha en 3001/5432, el preflight avisa pero no bloquea; el post-deploy gate demuestra después que **los contenedores de Mágina** no publican esos puertos.

El script nunca imprime passwords, tokens, API keys ni URLs de reset.

## 2. Deploy local A

Con preflight verde:

```bash
bash scripts/staging-release.sh deploy <release-A>
```

Todavía no conectar Cloudflare Tunnel.

## 3. Gate de aislamiento post-deploy

Ejecutar:

```bash
bash scripts/staging-host-postdeploy-gate.sh
```

El gate comprueba:

- existe un release `current` registrado;
- PostgreSQL está `running` y `healthy`;
- API está `running` y `healthy`;
- worker está `running`;
- web/Nginx está `running`;
- PostgreSQL no publica ningún puerto del host;
- API no publica ningún puerto del host;
- worker no publica ningún puerto del host;
- Nginx publica únicamente `127.0.0.1:<STAGING_BIND port>`;
- `/health/ready` responde 200 a través de Nginx local;
- la raíz PWA responde 200 por la misma entrada local.

## 4. Gate R2 usando el contenedor desplegado

Con el isolation gate verde:

```bash
bash scripts/staging-r2-gate.sh
```

Este wrapper ejecuta `r2-roundtrip-gate.mjs` dentro del contenedor API, usando exactamente su configuración R2. El host no necesita Node y las credenciales no se importan al shell.

Debe demostrar `PUT -> GET -> SHA-256 -> DELETE` y que el objeto borrado deja de ser legible.

Solo con aislamiento local + R2 verdes se configura el Tunnel hacia:

```text
http://127.0.0.1:<STAGING_BIND port>
```

## 5. Repetir después de cada release

El isolation gate debe ejecutarse después de:

- primer deploy A;
- deploy B;
- rollback a A;
- cualquier cambio de Compose/Nginx/redes Docker.

El smoke CI lo ejecuta automáticamente durante el ciclo sintético `A -> B -> rollback A`, de modo que futuras modificaciones del Compose que expongan accidentalmente API/PostgreSQL/worker deben romper CI antes de llegar al host.

## 6. Orden operativo completo

```text
host Linux
  -> env file 0600
  -> staging-host-preflight.sh
  -> staging-release.sh deploy A
  -> staging-host-postdeploy-gate.sh
  -> staging-r2-gate.sh
  -> Cloudflare Tunnel
  -> staging-https-gate.sh
  -> password recovery real
  -> deploy B
  -> staging-host-postdeploy-gate.sh
  -> HTTPS gate
  -> rollback A
  -> staging-host-postdeploy-gate.sh
  -> HTTPS gate
  -> backup off-host
  -> restore aislado
```

No usar datos reales de agricultores durante ninguno de estos gates.
