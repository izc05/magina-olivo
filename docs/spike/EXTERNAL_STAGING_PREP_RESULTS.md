# Mágina Olivo — External staging preparation results

Estado: **PREPARACIÓN EXTERNA VERDE EN CI; GATES REALES AÚN NO EJECUTADOS**.

Fecha: 2026-09-02.
Rama: `feat/technical-spike-v1`.
PR: #2, base `feat/foundation-v1`.

Última evidencia de regresión completa:

- workflow: `Technical Spike Smoke`;
- run: `33684901561` (#148);
- job: `100430269298`;
- conclusión: `success`.

Este documento distingue deliberadamente entre lo que ya se ha ejecutado y lo que solo está preparado para el primer host de staging.

## PASS ejecutado en CI

### Regresión completa

El run #148 volvió a pasar:

- instalación bloqueada con `npm ci`;
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
- deploy A;
- deploy B;
- rollback A.

### Validación de scripts operativos

CI ejecuta ahora antes del resto de gates:

- `bash -n` sobre todos los `scripts/*.sh`;
- `node --check` sobre todos los `scripts/*.mjs`.

Resultado en run #148: **PASS**.

Esto incluye sintaxis de:

- `staging-https-gate.sh`;
- `staging-backup.sh`;
- `staging-restore-gate.sh`;
- `r2-roundtrip-gate.mjs`;
- `export-private-objects.mjs`;
- `import-private-objects.mjs`;
- scripts existentes de smoke/release/worker/restore.

### Transporte de correo

El adapter de autenticación soporta ahora:

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

`compose.staging.yml` admite ahora:

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

Los siguientes puntos requieren recursos reales y no se marcan como demostrados por CI:

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
- Better Auth reset/revocación ya verde.

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
2. env file de secretos
3. dos buckets R2 de staging
4. gate R2 roundtrip
5. deploy release A
6. Cloudflare Tunnel
7. gate HTTPS/Secure/origin/logout
8. transporte Resend + correo real de reset
9. deploy release B
10. rollback A
11. backup off-host
12. restore DB + objetos en targets aislados
13. registrar evidencias
14. integrar UI final
15. decidir entrada a piloto cerrado
```

Hasta completar 3–12 con datos sintéticos, **no introducir datos reales de agricultores**.
