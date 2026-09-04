# Mágina Olivo — Recursos externos por fase / Staging V6

Documento auxiliar de preparación. **No forma parte del candidato desplegable.**

Candidato formal:

```text
staging/candidate-v6-2026-09-04
33dda6be7f74d9ffc33761177ed5ca3105bd492d
```

La finalidad de esta matriz es separar qué recurso externo bloquea cada fase del staging y qué puede prepararse más tarde. Nunca guardar secretos en este documento, issues, capturas o chat.

## Regla general

No es necesario tener todos los servicios externos listos antes del primer encendido del MiniPC.

Orden correcto:

1. host + Docker;
2. hostname decidido + AEMET + bucket R2 activo;
3. preflight;
4. deploy local;
5. Tunnel + cuenta sintética;
6. gate externo;
7. correo real;
8. backup/restore;
9. accesibilidad + PWA/offline.

---

## Fase A — Readiness del MiniPC

### Necesario

- MiniPC Linux compatible;
- Git;
- Docker Engine;
- Docker Compose v2;
- espacio libre suficiente;
- reloj/NTP razonable;
- puerto local 8088 disponible.

### No necesario todavía

- dominio;
- Tunnel;
- AEMET API Key;
- R2;
- correo;
- backup off-host.

Comando:

```bash
bash scripts/mini-pc-readiness.sh
```

Resultado esperado:

```text
READY FOR CONFIGURATION
```

---

## Fase B — Preparar `staging.env` y ejecutar `preflight`

### Bloqueantes reales

#### 1. Hostname de staging decidido

No hace falta que el Tunnel esté funcionando todavía, pero sí debemos conocer el hostname final porque Better Auth lo necesita desde el preflight:

```dotenv
BETTER_AUTH_URL=https://<staging-host>
BETTER_AUTH_TRUSTED_ORIGINS=https://<staging-host>
```

#### 2. Secretos locales

```text
POSTGRES_PASSWORD
BETTER_AUTH_SECRET
```

Deben ser exclusivos de staging.

#### 3. AEMET OpenData

Necesitamos una API Key real antes del preflight:

```dotenv
AEMET_API_KEY=<staging-only>
```

Política vigente de AEMET en septiembre de 2026:

- las antiguas claves sin expiración dejarán de aceptarse el 15/10/2026;
- las nuevas claves tienen una validez de 3 meses;
- conviene planificar rotación antes de la caducidad;
- el límite general indicado por AEMET es 40 consultas/minuto para toda la API, salvo restricciones adicionales de recursos concretos.

No guardar la API Key en Git ni en variables `VITE_*`.

Referencia oficial:

- https://opendata.aemet.es/centrodedescargas/faqs

#### 4. Cloudflare R2 — bucket activo

Antes del preflight deben existir:

```text
OBJECT_STORAGE_ENDPOINT
OBJECT_STORAGE_BUCKET
OBJECT_STORAGE_ACCESS_KEY_ID
OBJECT_STORAGE_SECRET_ACCESS_KEY
```

Para el primer deploy local basta con el bucket activo, por ejemplo:

```text
magina-olivo-staging-private
```

R2 permite generar credenciales S3 `Object Read & Write` limitadas a buckets concretos. La credencial secreta solo se muestra una vez al crearla.

Referencias:

- https://developers.cloudflare.com/r2/get-started/s3/
- https://developers.cloudflare.com/r2/api/tokens/

#### 5. Correo

**No es bloqueante para el primer preflight.**

Dejar expresamente:

```dotenv
AUTH_MAIL_TRANSPORT=disabled
```

Esto evita que el preflight exija `AUTH_MAIL_FROM` y `RESEND_API_KEY` antes de que el dominio de envío esté verificado.

### No necesario todavía

- Cloudflare Tunnel funcionando;
- cuenta sintética externa;
- segundo bucket de restore;
- Resend operativo;
- destino de backup off-host.

---

## Fase C — `deploy-local`

### Necesario

Todo lo requerido por `preflight`, más:

- salida HTTPS hacia R2;
- bucket activo accesible con las credenciales configuradas.

`deploy-local` ejecuta el roundtrip real:

```text
PUT -> GET -> SHA-256 -> DELETE
```

Por tanto **R2 sí bloquea el primer deploy local**.

### No necesario todavía

- Tunnel;
- correo;
- backup off-host;
- bucket de restore-validation.

No continuar con Cloudflare si `deploy-local` no termina en PASS.

---

## Fase D — Cloudflare Tunnel + gate externo

### Necesario

#### Cloudflare

- cuenta Cloudflare;
- dominio añadido/activo en Cloudflare;
- Tunnel;
- ruta publicada:

```text
https://<staging-host> -> http://127.0.0.1:8088
```

Cloudflare requiere un dominio en la cuenta para publicar aplicaciones mediante hostname.

Referencia:

- https://developers.cloudflare.com/tunnel/setup/

#### Cuenta sintética

Variables de la sesión del operador:

```text
STAGING_BASE_URL
STAGING_GATE_EMAIL
STAGING_GATE_PASSWORD
```

No persistir esas credenciales en documentación.

#### Cloudflare Access — opcional

Si protegemos el staging con Access:

```text
CF_ACCESS_CLIENT_ID
CF_ACCESS_CLIENT_SECRET
```

El gate acepta este service token.

### No necesario todavía

- Resend;
- segundo bucket de restore;
- backup off-host.

---

## Fase E — Correo / recuperación de contraseña

### Necesario

- dominio o subdominio de envío verificado en Resend;
- SPF verificado;
- DKIM verificado;
- remitente coherente;
- API key de Resend con permiso `Sending access`, idealmente limitada al dominio de staging.

Resend recomienda usar subdominios para aislar la reputación del correo.

Variables:

```dotenv
AUTH_MAIL_TRANSPORT=resend
AUTH_MAIL_FROM="Mágina Olivo <no-reply@<subdominio-verificado>>"
RESEND_API_KEY=<staging-only>
```

Referencias:

- https://resend.com/docs/dashboard/domains/introduction
- https://resend.com/docs/dashboard/api-keys/introduction

### Prueba obligatoria

- respuesta anti-enumeración;
- recepción real;
- token de un solo uso;
- contraseña nueva funcional;
- sesiones anteriores invalidadas cuando corresponda;
- ningún token en logs públicos.

---

## Fase F — Backup y restore

### Backup — necesario

Un destino **realmente fuera del MiniPC**.

No sirve otra carpeta del mismo SSD.

Ejemplos válidos:

- NAS montado;
- otro servidor;
- almacenamiento remoto montado;
- unidad extraíble que se desconecta y conserva fuera del host.

Variables:

```text
BACKUP_DESTINATION_DIR
BACKUP_DESTINATION_CONFIRMED_OFF_HOST=1
```

### Restore — necesario

- base PostgreSQL aislada;
- segundo bucket R2 vacío y separado, por ejemplo:

```text
magina-olivo-staging-restore-validation
```

Las credenciales R2 deben tener acceso al bucket activo y al bucket de restore-validation si se reutiliza el mismo conjunto de credenciales del contenedor.

Variables:

```text
RESTORE_BUNDLE_DIR
RESTORE_DATABASE=magina_restore_validation
RESTORE_OBJECT_STORAGE_BUCKET=magina-olivo-staging-restore-validation
RESTORE_TARGETS_CONFIRMED_ISOLATED=1
```

Un backup no cuenta como validado hasta completar el restore.

---

## Fase G — Accesibilidad

No requiere nuevos proveedores externos.

Necesitamos al menos:

- Chrome Android + TalkBack o NVDA + navegador desktop;
- teclado;
- prueba 200 % zoom/reflow;
- reduced-motion;
- foco visible;
- navegación anunciada;
- adjunto operable sin ratón.

Usar:

```text
docs/mvp/ACCESSIBILITY_GATE_V1.md
```

---

## Fase H — PWA / offline

No requiere nuevas credenciales externas.

Necesitamos:

- dispositivo Android o navegador PWA compatible;
- usuario sintético;
- capacidad de cortar/restaurar red;
- misma revisión V6 ya validada externamente.

Comprobar:

- entrega offline;
- labor offline;
- outbox persistente;
- Modo protegido;
- reintento;
- deduplicación servidor;
- timeline posterior;
- bloqueo de logout con pendientes.

---

## Matriz resumida

| Recurso | Readiness | Preflight | Deploy local | External | Mail | Backup/Restore |
| --- | --- | --- | --- | --- | --- | --- |
| Linux + Docker | Sí | Sí | Sí | Sí | Sí | Sí |
| Hostname decidido | No | Sí | Sí | Sí | Sí | Sí |
| AEMET API Key | No | Sí | Sí | Sí | Sí | Sí |
| R2 bucket activo | No | Sí | Sí | Sí | Sí | Sí |
| R2 credenciales | No | Sí | Sí | Sí | Sí | Sí |
| Cloudflare Tunnel | No | No | No | Sí | Sí | Sí |
| Cuenta sintética | No | No | No | Sí | Sí | Sí |
| Resend dominio/API key | No | No | No | No | Sí | Sí |
| Backup off-host | No | No | No | No | No | Sí |
| Bucket restore | No | No | No | No | No | Sí |

## Estado inicial recomendado

Antes de encender el MiniPC basta con tener preparados o decididos:

1. hostname que usaremos;
2. una nueva API Key AEMET;
3. R2 habilitado;
4. bucket privado activo;
5. credenciales S3 limitadas;
6. contraseñas/secreto Better Auth que se generarán localmente.

Cloudflare Tunnel, Resend, backup y bucket de restore pueden completarse por fases después de obtener `deploy-local PASS`.
