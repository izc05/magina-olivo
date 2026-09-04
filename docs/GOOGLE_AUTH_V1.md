# Google OAuth V1 — Mágina Olivo

## Objetivo

Permitir que una persona entre o cree su cuenta de Mágina Olivo con Google sin sustituir el acceso tradicional por correo y contraseña.

## Comportamiento

- El acceso por correo + contraseña sigue habilitado.
- `Continuar con Google` inicia OAuth 2.0 mediante Better Auth.
- Un usuario nuevo de Google vuelve a `/onboarding`.
- Un usuario existente vuelve a `/`.
- Si ya existe una cuenta con el mismo correo y Google confirma ese correo, Better Auth puede vincular la identidad Google a la cuenta existente en lugar de crear un usuario duplicado.
- No se solicitan permisos de Gmail ni acceso al buzón. El proveedor se usa únicamente para autenticación básica de identidad.
- Si no están definidas las dos credenciales de Google, el backend sigue arrancando y el acceso por correo/contraseña continúa disponible.

## Variables de entorno

```env
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

Nunca se deben guardar valores reales en Git ni en archivos públicos.

## Google Cloud Console

Crear un cliente OAuth de tipo `Web application` y registrar los orígenes y callbacks de cada entorno.

Desarrollo local:

```text
http://localhost:5173/api/auth/callback/google
```

Staging, usando el host público configurado en `BETTER_AUTH_URL`:

```text
https://staging-magina.isivoltpro.com/api/auth/callback/google
```

Producción debe usar el dominio definitivo de Mágina Olivo con el mismo sufijo:

```text
https://DOMINIO/api/auth/callback/google
```

## Seguridad y privacidad

- Scopes esperados: identidad básica (`openid`, `email`, `profile`).
- No solicitar scopes de Gmail, Drive, Calendar u otros servicios.
- Cookies de sesión siguen siendo `HttpOnly` y `SameSite=Lax`; en producción se usan cookies seguras HTTPS.
- CSRF y validación de origen permanecen habilitados.
- No registrar tokens OAuth ni secretos en logs.
- El enlace implícito se limita a correo coincidente; no se permiten enlaces automáticos entre correos diferentes.

## Panel de administración

El método de acceso se obtiene de las cuentas Better Auth asociadas a cada usuario:

- `credential` → correo/contraseña.
- `google` → Google.
- Si aparecen ambos, el usuario tiene los dos métodos vinculados.

La consola de administración debe mostrar estos valores como etiquetas de solo lectura y no debe exponer tokens, secretos ni identificadores OAuth innecesarios.

Campos recomendados en la tabla de usuarios:

- Usuario / correo.
- Estado.
- Fecha de alta.
- Último acceso.
- Método(s) de acceso: `Correo`, `Google` o `Correo + Google`.

## Gate de activación

Antes de activar Google en staging:

1. Configurar `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` fuera del repositorio.
2. Confirmar que `BETTER_AUTH_URL` coincide exactamente con el origen público HTTPS.
3. Registrar el callback `/api/auth/callback/google` en Google Cloud.
4. Probar cuenta Google nueva → onboarding.
5. Probar correo existente + Google del mismo correo → mismo usuario, sin duplicado.
6. Confirmar cierre de sesión y nuevo inicio con ambos métodos.
7. Confirmar que no se solicita permiso de Gmail.
