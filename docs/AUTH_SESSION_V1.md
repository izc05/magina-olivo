# Autenticación y sesiones V1 — Mágina Olivo

Estado: decisión candidata para spike.

## Objetivo

Proteger datos privados de explotación con una experiencia sencilla para agricultor, evitando patrones frágiles como tokens de larga duración almacenados en `localStorage`.

## Base técnica candidata

- Better Auth como candidato inicial a validar.
- PostgreSQL como almacenamiento de usuarios/sesiones.
- Sesión server-side con identificador opaco en cookie.
- Cookies `HttpOnly`, `Secure` en producción y `SameSite` configurado según topología real.
- Node.js 24 LTS para el spike.

Better Auth documenta integración PostgreSQL y sesión tradicional basada en cookie; su adopción final queda condicionada al spike de seguridad, migraciones y ergonomía operativa.

## Registro V1

Para piloto:
- email;
- contraseña;
- nombre visible.

Opcional posterior:
- magic link;
- passkeys;
- proveedores sociales;
- 2FA.

No introducir métodos adicionales hasta que aporten valor al piloto.

## Contraseñas

La librería de autenticación debe gestionar hashing seguro y actualización de parámetros.

Nunca:
- guardar password plaintext;
- registrar password en logs;
- enviar password a analytics;
- crear un PIN agrícola separado como sustituto inseguro de auth.

## Verificación de email

Antes de piloto externo, definir:
- si se exige verificación antes de acceso completo;
- expiración de enlaces;
- rate limiting;
- comportamiento ante email ya registrado.

Para desarrollo se puede usar proveedor de correo local/captura, nunca correos reales por accidente.

## Cookies

Objetivo producción:
- `HttpOnly=true`;
- `Secure=true`;
- scope de dominio mínimo necesario;
- prefijo/nombre propio de Mágina Olivo;
- expiración documentada;
- rotación de secreto de auth planificada.

Evitar compartir cookie entre subdominios si no existe una necesidad real.

## Duración de sesión

Propuesta inicial:
- sesión persistente razonable para una PWA de uso frecuente;
- revocable server-side;
- renovación controlada;
- cambio de contraseña / acción de seguridad puede invalidar otras sesiones.

La cifra concreta se fijará en spike y piloto, equilibrando comodidad y riesgo.

## Logout

Logout debe:
1. revocar/invalidar sesión server-side;
2. eliminar cookie;
3. limpiar cachés privadas del navegador;
4. borrar IndexedDB privada/outbox únicamente tras política segura.

### Cuidado con outbox offline

Si existen escrituras pendientes, no se deben enviar bajo una cuenta diferente tras logout/login.

Estrategia:
- outbox namespaced por user/holding;
- al logout, mostrar si hay operaciones no sincronizadas;
- opción segura de sincronizar antes de salir cuando haya conexión;
- si se borra, confirmación explícita porque puede implicar pérdida de borradores locales.

Nunca mezclar outbox de dos usuarios en un dispositivo compartido.

## Autorización

Autenticación responde «quién eres».
Autorización responde «qué puedes hacer».

La API comprueba en cada recurso privado:
- usuario autenticado;
- membresía activa en `holding`;
- rol suficiente;
- pertenencia del recurso al holding.

No confiar en IDs que envíe el frontend.

## Roles V1 preparados

- `owner`: control completo funcional;
- `admin`: gestión amplia sin poder transferir propiedad salvo diseño expreso;
- `collaborator`: crear/editar operativa permitida;
- `viewer`: solo lectura.

El piloto puede exponer únicamente `owner`, pero la base no debe requerir migración estructural para añadir colaboradores.

## CSRF

Si se usan cookies de sesión, las escrituras deben protegerse según la arquitectura final mediante:
- `SameSite` correcto;
- verificación de `Origin`/`Host`;
- mecanismos CSRF propios de la librería cuando apliquen;
- CORS restrictivo.

No usar `Access-Control-Allow-Origin: *` con credenciales.

## Rate limiting

Aplicar límites al menos en:
- login;
- registro;
- recuperación de contraseña;
- verificación de email;
- subida de documentos;
- importaciones;
- endpoints costosos externos/IA futura.

El rate limit no sustituye otras defensas.

## Recuperación de contraseña

Requisitos:
- token de un solo uso y expiración corta razonable;
- respuesta que no facilite enumeración de cuentas;
- invalidación tras uso;
- audit event de solicitud/cambio sin registrar token.

## Sesiones y dispositivos

Futuro deseable:
- listar sesiones activas;
- revocar sesión concreta;
- cerrar todas menos la actual.

No es bloqueo de primer spike, pero la elección de auth no debe impedirlo.

## Acciones sensibles

Posible reautenticación para:
- eliminar cuenta;
- transferir ownership;
- exportación integral muy sensible;
- cambios críticos de email/seguridad.

No imponer reauth a cada entrega o labor: perjudicaría el uso en campo.

## PWA instalada

La PWA usa la misma sesión web segura.

No asumir que «instalada» equivale a dispositivo confiable.

Un teléfono perdido debe poder perder acceso revocando sesiones.

## Secretos

Secretos de auth:
- solo backend/secret manager;
- distintos por entorno;
- nunca commit;
- rotación documentada;
- staging y producción separados.

## Logging de seguridad

Registrar de forma prudente:
- login exitoso/fallido agregado;
- logout;
- recuperación/cambio de contraseña;
- creación/revocación de sesión;
- cambios de rol/membresía;
- denegaciones sensibles.

No registrar:
- password;
- session token;
- reset token;
- cookies completas;
- documentos privados.

## Criterios del spike de auth

Better Auth se adopta si supera:
1. PostgreSQL limpio/migrable;
2. integración Fastify estable;
3. cookies correctas en local/staging/prod;
4. CSRF/CORS claros;
5. sesiones revocables;
6. recuperación de contraseña viable;
7. tests E2E;
8. sin acoplar la autorización de holdings al framework de auth.

Si falla alguno de estos puntos, sustituir el proveedor sin cambiar el modelo de dominio.
