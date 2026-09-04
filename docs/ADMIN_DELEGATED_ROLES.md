# Administración delegada — Mágina Olivo

## Objetivo

Permitir que varias personas trabajen en el panel de Mágina Olivo sin compartir una cuenta Superadmin y sin recibir acceso a áreas que no necesitan.

La autorización siempre se valida en el servidor. Ocultar un enlace en la interfaz no se considera una medida de seguridad.

## Superadmin

Hay dos vías de Superadmin:

1. `MAGINA_ADMIN_EMAILS`: allowlist de arranque/recuperación configurada en el servidor.
2. Rol persistente `superadmin` en `platform_admin_memberships`.

Ambas tienen la misma autoridad sobre los módulos heredados y nuevos.

Las cuentas del allowlist no pueden modificarse desde la interfaz. La cuenta Superadmin actual y los Superadmin persistentes también quedan protegidos en la tabla normal de delegación para reducir cambios accidentales.

## Rol Comercial

Acceso efectivo:

- `/admin/finanzas`;
- tarifas comerciales;
- contratos publicitarios;
- control interno de cobros;
- renovaciones.

No obtiene automáticamente acceso a `/admin/publicidad`; la activación pública de campañas sigue bajo Superadmin en esta fase.

## Rol Contenido

Acceso efectivo:

- `/admin/contenido`;
- noticias verificadas y destacados;
- avisos propios de Mágina Olivo;
- resumen agregado de alertas meteorológicas.

No puede editar cooperativas, usuarios, soporte, legal, sistema ni roles.

Los avisos de plataforma siguen claramente separados de alertas oficiales AEMET/RAIF/protección civil.

## Rol Soporte

Acceso efectivo:

- bandeja de tickets;
- datos de contacto del solicitante necesarios para atender el caso;
- estado/prioridad;
- notas internas.

No puede acceder a:

- documentos legales;
- evidencias del sistema;
- lista global de usuarios;
- cierre de sesiones;
- parcelas, entregas o documentos agrícolas privados;
- roles administrativos.

## Rol Operaciones

Acceso efectivo:

- directorio y cooperativas públicas;
- fuentes de información;
- auditoría administrativa resumida sin correo del actor;
- evidencias operativas de backup/restore/deploy.

Puede registrar el estado de una evidencia, pero el navegador no dispone de comandos para ejecutar backup, restore o despliegues.

No puede acceder a:

- lista global de usuarios;
- cierre de sesiones;
- soporte y correos de solicitantes;
- documentos legales;
- roles;
- datos agrícolas privados.

## Entrada al panel

`GET /api/v1/admin/access` devuelve únicamente los roles y capacidades de la sesión actual.

Un administrador delegado que abre `/admin` recibe un panel de trabajo reducido con solo sus módulos. Un Superadmin conserva el centro de mando completo.

`GET /api/v1/admin/scoped-summary` devuelve únicamente agregados correspondientes a módulos autorizados para la sesión.

## Endpoints delegados

### Soporte

- `GET /api/v1/admin/delegated/support/tickets`
- `PATCH /api/v1/admin/delegated/support/tickets/:ticketId`
- `POST /api/v1/admin/delegated/support/tickets/:ticketId/notes`

### Operaciones

- `GET /api/v1/admin/delegated/operations/directory`
- `PATCH /api/v1/admin/delegated/operations/directory/:destinationId`
- `GET /api/v1/admin/delegated/operations/sources`
- `GET /api/v1/admin/delegated/operations/audit`
- `GET /api/v1/admin/delegated/operations/system`
- `PATCH /api/v1/admin/delegated/operations/system/:evidenceKey`

Contenido mantiene sus rutas existentes `/api/v1/admin/content/*`, ahora protegidas por el rol `content`.

## Auditoría

Los cambios delegados reutilizan `platform_admin_audit_log`.

Se auditan, entre otros:

- cambios de tickets;
- notas internas;
- cambios del directorio;
- cambios de evidencias operativas;
- noticias y avisos.

La vista de auditoría del rol Operaciones omite el correo del administrador que realizó la acción.

## Principios de seguridad

- deny-by-default;
- comprobación server-side en cada endpoint;
- mínimo privilegio;
- sin secretos en frontend;
- sin acceso administrativo derivado de roles de una explotación agrícola;
- sin ejecución de restore desde el navegador;
- sin ampliación implícita de permisos por disponer de varios roles;
- cambios de roles solo desde Superadmin.
