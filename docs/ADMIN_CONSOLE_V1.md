# Consola de administración de plataforma V1

## Propósito

La consola `/admin` permite supervisar la plataforma Mágina Olivo sin convertir al soporte en propietario de los datos de agricultores.

La primera entrega muestra únicamente métricas agregadas: cuentas, explotaciones, fincas, parcelas, cooperativas públicas y campañas activas. No lista documentos, entregas, rendimientos, ubicaciones ni perfiles de agricultores.

## Roles de plataforma

Los roles globales se almacenan en `platform_admin_members` y son independientes de `holding_members`:

- `super_admin`: bootstrap inicial y administración futura de roles mediante flujo auditado.
- `admin`: administración de plataforma dentro de los módulos concedidos.
- `editor`: gestión de contenido público cuando ese módulo esté habilitado.
- `support`: soporte limitado y basado en solicitudes identificadas.

Un `owner` o `admin` de una explotación no obtiene acceso a `/admin` por ese hecho.

## Alta de la primera superadministradora

1. La persona administradora crea su cuenta normal e inicia sesión al menos una vez.
2. En el entorno secreto de staging o producción se define temporalmente `PLATFORM_SUPER_ADMIN_EMAIL` y `PLATFORM_SUPER_ADMIN_CONFIRM=GRANT_SUPER_ADMIN`.
3. Se ejecuta `npm run admin:bootstrap --workspace @magina/api` una sola vez.
4. Se eliminan ambas variables del entorno secreto.

El script rechaza la operación si ya existe una `super_admin`, si la cuenta no existe o si falta la confirmación explícita. La dirección de correo nunca se añade al repositorio.

## Seguridad

- Todas las rutas `/api/v1/admin/*` requieren sesión y un rol de plataforma activo en el servidor.
- Las respuestas administrativas usan `cache-control: no-store`.
- Las lecturas del resumen quedan registradas en `platform_admin_audit_log` sin documentos, credenciales ni contenido sensible.
- Cualquier acceso excepcional a información privada debe diseñarse como permiso temporal, específico y auditado; no forma parte de esta consola inicial.
