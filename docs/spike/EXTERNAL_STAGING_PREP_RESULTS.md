# Mágina Olivo — External staging preparation results

Estado: **PREPARACIÓN EXTERNA VERDE EN CI; GATES REALES AÚN NO EJECUTADOS**.

Fecha: 2026-09-02.
Rama: `feat/technical-spike-v1`.
PR: #2, base `feat/foundation-v1`.

Última evidencia de regresión completa:

- workflow: `Technical Spike Smoke`;
- run: `33685574076` (#153);
- job: `100432498783`;
- conclusión: `success`.

Este documento distingue deliberadamente entre lo que ya se ha ejecutado y lo que solo está preparado para el primer host de staging.

## PASS ejecutado en CI

### Regresión completa

El run #153 pasó:

- instalación bloqueada con `npm ci`;
- validación sintáctica de scripts operativos;
- TypeScript strict;
- unit tests;
- migraciones Better Auth;
- migraciones de negocio;
- worker duradero + lease recovery;
- build PWA;
- inspección del bundle para secretos;
- producción falla cerrada con storage privado local;
- flujo agrícola vertical;
- password reset + revocación de sesiones;
- rate limiting;
- stack Docker staging aislado;
- deploy A + gate de aislamiento post-deploy;
- deploy B + gate de aislamiento post-deploy;
- rollback A + gate de aislamiento post-deploy.

### Validación de scripts operativos

CI ejecuta antes del resto de gates:

- `bash -n` sobre todos los `scripts/*.sh`;
- `node --check` sobre todos los `scripts/*.mjs`.

Resultado en run #153: **PASS**.

Esto incluye sintaxis de:

- `staging-host-preflight.sh`;
- `staging-host-postdeploy-gate.sh`;
- `staging-https-gate.sh`;
- `staging-backup.sh`;
- `staging-restore-gate.sh`;
- `r2-roundtrip-gate.mjs`;
- `export-private-objects.mjs`;
- `import-private-objects.mjs`;
- scripts existentes de smoke/release/worker/restore.

### Gate de aislamiento post-deploy

El release lifecycle CI ejecuta ahora `staging-host-postdeploy-gate.sh` tres veces: tras A, tras B y tras rollback A.

En las tres transiciones se demostró:

- PostgreSQL `running` + `healthy`;
- API `running` + `healthy`;
- worker `running`;
- Nginx/web `running`;
- PostgreSQL sin puertos publicados al host;
- API sin puertos publicados al host;
- worker sin puertos publicados al host;
- Nginx publicado únicamente en `127.0.0.1:<STAGING_BIND>`;
- `/health/ready` 200 a través de Nginx local;
- raíz PWA 200 por la misma entrada same-origin.

Esto convierte el aislamiento del host en una regresión automática: una futura modificación de Compose que exponga 3001/5432 o abra Nginx fuera de loopback debe romper el release gate.

### Preflight del host preparado

`staging-host-preflight.sh` valida antes del primer deploy real:

- Linux y arquitectura soportada;
- Docker + Compose v2;
- utilidades mínimas;
- env file no accesible a grupo/otros;
- claves obligatorias presentes sin imprimir valores;
- `BETTER_AUTH_URL` HTTPS;
- trusted origins coherentes;
- object storage HTTPS;
- `STAGING_BIND` loopback;
- `capture` de correo prohibido;
- configuración Resend completa si se activa;
- mínimo de disco libre;
- advertencia NTP;
- puertos 3001/5432 no ocupados previamente en el host.

Su sintaxis está validada por CI; su ejecución con un host real sigue pendiente.

### Transporte de correo

El adapter de autenticación soporta:

- `disabled`;
- `capture` exclusivamente en `NODE_ENV=test`;
- `resend` para staging/piloto.

El test unitario del transporte `resend` confirma:

- endpoint HTTPS esperado;
- autenticación Bearer;
- `Idempotency-Key` derivada del reset concreto;
- remitente y destinatario estructurados;
- texto de recuperación con enlace;
- API key ausente del body;
- `queuePasswordResetEmail()` devuelve inmediatamente y no espera al proveedor.

La función de envío captura fallos del proveedor sin imprimir email, reset URL/token, body remoto ni credenciales.

El flujo funcional Better Auth sigue demostrando:

- token de reset de un solo uso;
- contraseña antigua invalidada;
- contraseña nueva válida;
- revocación de sesiones anteriores.

### Staging secrets wiring

`compose.staging.yml` admite:

- `AUTH_MAIL_TRANSPORT`;
- `AUTH_MAIL_FROM`;
- `RESEND_API_KEY`.

Los scripts `staging-release.sh`, `staging-backup.sh` y `staging-restore-gate.sh` eliminan también estas variables del entorno heredado antes de llamar a Docker Compose. El secrets-managed env file sigue siendo autoritativo.

### Backup externo preparado

`staging-backup.sh` está preparado para generar fuera del host:

```text
postgres.dump
backup-meta.txt
database-manifest.txt
SHA256SUMS
objects/
  objects-manifest.json
  <private object files>
```

Protecciones incorporadas:

- exige destino absoluto existente y escribible;
- exige `BACKUP_DESTINATION_CONFIRMED_OFF_HOST=1`;
- usa `pg_dump` PG18 desde el contenedor PostgreSQL;
- no necesita Node/npm instalado en el host;
- exporta objetos privados mediante la imagen runtime;
- registra key/tamaño/SHA-256 por objeto;
- registra manifiesto relacional de entidades críticas y suma de kilos;
- genera y valida `SHA256SUMS` del bundle completo;
- no copia env file ni secretos al bundle.

### Restore externo no destructivo preparado

`staging-restore-gate.sh` y `import-private-objects.mjs` implementan un simulacro aislado:

- rechaza restaurar sobre `magina_olivo`;
- exige confirmación explícita de targets aislados;
- verifica `SHA256SUMS` antes de restaurar;
- restaura PostgreSQL en `magina_restore_validation` o nombre aislado equivalente;
- reconstruye el manifiesto relacional y exige `diff` exacto;
- usa un bucket de recuperación vacío separado;
- valida cada archivo de backup por tamaño + SHA-256 antes de subir;
- rechaza claves de objeto fuera del contrato privado;
- rechaza por defecto usar el mismo nombre de bucket que el origen del backup;
- vuelve a descargar cada objeto restaurado y verifica SHA-256;
- compara el inventario final del bucket con el manifiesto;
- en fallo de carga intenta eliminar objetos subidos parcialmente.

## PREPARADO pero todavía NO PASS externo

Los siguientes puntos requieren recursos reales y no se marcan como demostrados por CI.

### Host real

Preparado:

- preflight de host;
- deploy reproducible;
- post-deploy isolation gate;
- regresión automática del isolation gate en A/B/rollback.

Pendiente real:

- seleccionar host de staging;
- ejecutar preflight en él;
- desplegar release A allí;
- repetir isolation gate sobre el host físico elegido.

### Cloudflare Tunnel / HTTPS

Preparado:

- una única entrada loopback de Nginx;
- gate HTTPS real;
- soporte opcional de Cloudflare Access service token;
- comprobación de HSTS;
- cookie `HttpOnly` + `Secure` + `SameSite=Lax`;
- `/me` privado `no-store`;
- origen hostil => 403;
- logout => sesión inválida.

Pendiente real:

- hostname de staging;
- Tunnel real;
- certificado/edge real;
- ejecución del gate desde Internet.

### Cloudflare R2

Preparado:

- adapter S3/R2;
- gate `PUT -> GET -> SHA-256 -> DELETE`;
- exportador;
- importador verificado;
- backup/restore aislado.

Pendiente real:

- bucket privado de staging;
- bucket separado de restore-validation;
- credenciales staging-only;
- roundtrip real;
- backup real de objetos;
- restore real de objetos.

### Correo transaccional

Preparado:

- transporte Resend sin SDK adicional;
- env wiring;
- test unitario del request;
- Better Auth reset/revocación verde.

Pendiente real:

- cuenta/proyecto Resend de staging;
- dominio/remitente verificado;
- API key staging-only;
- recepción real del correo;
- reset end-to-end desde correo recibido.

### Backup off-host

Preparado:

- bundle reproducible;
- checksums;
- manifiestos;
- bloqueo si no se confirma destino off-host.

Pendiente real:

- seleccionar/montar destino externo al host;
- ejecutar primer backup;
- ejecutar restore drill con ese bundle.

## Próxima secuencia de ejecución

Cuando exista el host de staging:

```text
1. host limpio
2. secrets-managed env file
3. staging-host-preflight
4. dos buckets R2 de staging
5. R2 roundtrip
6. deploy release A
7. host post-deploy isolation gate
8. Cloudflare Tunnel
9. HTTPS/Secure/origin/logout gate
10. transporte Resend + correo real de reset
11. deploy release B + isolation gate
12. rollback A + isolation gate
13. backup off-host
14. restore DB + objetos en targets aislados
15. registrar evidencias
16. integrar UI final
17. decidir entrada a piloto cerrado
```

Hasta completar 3–14 con datos sintéticos, **no introducir datos reales de agricultores**.
