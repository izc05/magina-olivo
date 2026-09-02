# Staging gate — Mágina Olivo

Estado: contrato previo al primer despliegue técnico.

El staging existe para probar la arquitectura completa bajo HTTPS antes del piloto. No es producción ni debe contener datos reales de agricultores mientras no se hayan cerrado privacidad, backups, almacenamiento y operación.

## Objetivos

Staging debe demostrar en un entorno accesible por HTTPS:

- PWA servida desde el origen previsto;
- API y Better Auth detrás del mismo origen o de una política de orígenes explícita;
- cookie de sesión `HttpOnly`, `Secure` y `SameSite=Lax`;
- PostgreSQL no expuesto a Internet;
- worker conectado a la misma base pero ejecutado como proceso separado;
- documentos privados fuera del directorio público de la web;
- health checks de API;
- backup/restore reproducible;
- ninguna clave de servidor dentro del bundle PWA.

## Datos permitidos

Solo datos sintéticos.

Prohibido en staging inicial:

- tickets reales;
- nombres/DNI de agricultores;
- liquidaciones reales;
- credenciales de cooperativas;
- claves reutilizadas de producción;
- fotografías privadas reales.

## Servicios

```text
Internet
   |
 HTTPS
   |
Edge / tunnel
   |
   +-- Web PWA
   |
   +-- API Fastify
           |
           +-- PostgreSQL (red privada)
           +-- almacenamiento privado

Worker ------------+-- PostgreSQL
                   +-- APIs externas futuras
```

La base de datos no tendrá puerto público. El worker no tendrá endpoint HTTP público salvo que se justifique posteriormente para métricas/health internos.

## Secretos

Variables mínimas de staging:

- `DATABASE_URL`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `BETTER_AUTH_TRUSTED_ORIGINS`
- credenciales de object storage cuando exista el adapter productivo
- claves AEMET u otras únicamente cuando se habiliten sus adapters

Reglas:

- nunca `.env` real en Git;
- secretos distintos de desarrollo/producción;
- rotación posible sin rebuild del frontend;
- frontend no consume secretos de backend;
- logs no imprimen cookies, tokens ni contenido documental.

## Gates HTTPS/session

Antes de considerar staging PASS:

- `Set-Cookie` contiene `HttpOnly`;
- `Set-Cookie` contiene `Secure`;
- `SameSite=Lax` salvo decisión explícita distinta;
- logout invalida la sesión;
- origen hostil no puede ejecutar mutaciones autenticadas;
- respuesta privada usa `Cache-Control: no-store`;
- CSP y headers básicos presentes;
- Cloudflare/proxy no rompe la detección del origen real.

## Storage

El adapter local del spike no es aceptable para staging público definitivo.

El gate productivo será:

- bucket/object storage privado;
- object keys generadas por servidor;
- límites de tamaño/MIME;
- comprobación de hash/metadata;
- acceso temporal o streaming autorizado;
- ningún objeto público por defecto;
- backup/inventario restaurable.

R2 sigue siendo candidato, no dependencia arquitectónica.

## Backup

Staging debe ejecutar la misma idea ya demostrada en CI:

1. dump PostgreSQL;
2. copia independiente de documentos;
3. copia fuera del host principal;
4. restore sobre destino limpio;
5. verificación de registros y checksum de documento.

Un backup no cuenta como operativo hasta que el restore de staging también haya pasado.

## Observabilidad mínima

- request ID;
- status/latencia API;
- health live/ready;
- job ID/kind/attempts/estado del worker;
- contador de jobs en `retry`/`failed`;
- errores sin secretos ni payload documental.

## Criterio de entrada

No desplegar staging hasta que el smoke CI principal esté verde con:

- `npm ci`;
- migraciones;
- auth;
- multi-tenant;
- idempotencia;
- outbox por usuario;
- concurrencia;
- documentos privados;
- timeline;
- worker;
- restore;
- controles de origen y logout.

## Criterio de salida

Staging queda listo para integrar la UI visual cuando:

- los gates anteriores se repiten bajo HTTPS;
- la cookie `Secure` queda comprobada end-to-end;
- se decide/implementa object storage privado real;
- existe un procedimiento de despliegue y rollback;
- no se usan datos reales.
