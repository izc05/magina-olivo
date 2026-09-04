# Mi Cuenta — Privacidad, portabilidad y baja V1

## Estado

Diseño de implementación para `feat/account-privacy-delete-v1`.

Esta rama se apoya en:
- registro y onboarding ya integrados;
- preferencias de cuenta ya integradas;
- exportación/portabilidad estructurada ya integrada;
- centro público de privacidad y contacto preparado en la rama anterior.

No debe crear un segundo sistema de cuentas, exportación o notificaciones.

## Objetivo V1

Completar `Mi Cuenta` con un centro de privacidad usable desde móvil que permita al usuario entender y controlar sus datos sin tener que solicitar acciones ordinarias por correo.

## Pantalla objetivo

`/cuenta`

### Bloque: Mis datos
- correo de la cuenta;
- fecha de alta cuando esté disponible;
- explotación activa;
- enlace a preferencias.

### Bloque: Privacidad y datos
- `Descargar mis datos` → reutiliza el flujo asíncrono existente de exportación;
- `Política de privacidad` → `/privacidad`;
- `Fuentes y metodología` → `/fuentes`;
- información clara sobre qué datos son públicos y cuáles privados.

### Bloque: Comunicaciones y permisos
- preferencias de avisos ya existentes;
- ubicación: explicar finalidad y pedir permiso solo cuando el usuario invoque una función que la necesite;
- notificaciones: pedir permiso solo al activar una alerta compatible;
- comunicaciones comerciales separadas y opcionales si se incorporan en el futuro.

### Bloque: Eliminar cuenta
Acción diferenciada visualmente y nunca accidental.

Flujo propuesto:
1. usuario pulsa `Eliminar mi cuenta`;
2. pantalla explica qué se eliminará y qué podría conservarse por obligación legal/seguridad;
3. usuario debe volver a autenticarse si la sesión no es reciente;
4. confirmación explícita escribiendo `ELIMINAR` o equivalente accesible;
5. backend crea solicitud de baja idempotente;
6. se revocan sesiones;
7. se ejecuta eliminación/anonimización según política documentada;
8. se devuelve justificante mínimo de la solicitud sin conservar más datos de los necesarios.

No se implementará un botón que simplemente oculte la cuenta manteniendo indefinidamente los datos sin informar al usuario.

## Backend propuesto

### Endpoint
`POST /api/v1/account/deletion-requests`

Requisitos:
- autenticación;
- reautenticación o sesión reciente;
- idempotencia;
- rate limit;
- no aceptar `userId` arbitrario: siempre `session.user.id`;
- bloquear operaciones nuevas una vez confirmada la baja, salvo cancelación si se decide ofrecer periodo de gracia;
- auditar únicamente los eventos mínimos necesarios de seguridad/compliance.

### Modelo orientativo
`account_deletion_requests`
- `id`
- `user_id`
- `status`: `requested | processing | completed | cancelled | failed`
- `requested_at`
- `scheduled_for` nullable
- `completed_at` nullable
- `reason_code` opcional y no sensible
- `version`

No guardar el texto libre del motivo salvo necesidad real.

## Política de conservación

Antes de producción debe existir una matriz por categoría:

| Categoría | Acción al borrar | Conservación |
| --- | --- | --- |
| Perfil/preferencias | eliminar | inmediata o periodo técnico mínimo |
| Fincas/parcelas/campañas privadas | eliminar o anonimizar según dependencia | definir antes de producción |
| Documentos aportados | eliminar del almacenamiento y referencias | definir proceso y verificación |
| Exportaciones temporales | eliminar | TTL existente |
| Logs de seguridad | minimizar y rotar | periodo documentado |
| Mensajes de contacto | conservar solo lo necesario para la consulta | periodo documentado |

La decisión final debe validarse con la infraestructura y obligaciones reales del titular.

## Derechos de protección de datos

La aplicación facilitará un canal para:
- acceso;
- rectificación;
- supresión;
- oposición;
- limitación;
- portabilidad.

Las acciones automatizables se resolverán dentro de Mi Cuenta. Las solicitudes no automatizables se derivarán a `/contacto` con categoría `Privacidad y datos`.

## Criterios de aceptación

- [ ] exportación existente visible y comprensible desde Mi Cuenta;
- [ ] descarga no expone datos de otros usuarios;
- [ ] baja requiere confirmación fuerte;
- [ ] revocación de sesiones tras baja;
- [ ] documentos privados incluidos en la política de borrado;
- [ ] no quedan botones falsos o no funcionales;
- [ ] política de conservación documentada con valores reales antes de producción;
- [ ] pruebas E2E con dos usuarios para aislamiento;
- [ ] recuperación ante job fallido sin doble borrado;
- [ ] enlaces visibles a privacidad y contacto;
- [ ] revisión jurídica final antes de publicación.

## Fuera de alcance de este slice

- marketing automation;
- perfiles públicos;
- comunidad/social;
- venta de datos;
- consentimiento agrupado para finalidades distintas;
- nuevas cookies de tracking.

## Integración

Esta rama permanece separada de `main` y de `staging/candidate-v5-2026-09-03`. Solo debe integrarse en `feat/integration-v2-mvp-v1` cuando sus gates y la política final estén cerrados.
