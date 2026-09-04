# Mágina Olivo — Operaciones administrativas V1

## Alcance

La ruta `/admin/operaciones` amplía el panel privado con herramientas de soporte y mantenimiento de contenido público, manteniendo separadas las funciones de plataforma de los permisos agrícolas de cada explotación.

## Usuarios y soporte

La consola muestra únicamente identidad de cuenta y resumen de pertenencia a explotaciones:

- nombre y correo de la cuenta;
- número de explotaciones activas;
- roles de pertenencia;
- fecha de alta y última actualización disponible.

No abre desde esta pantalla:

- parcelas;
- entregas;
- rendimientos;
- documentos;
- notas privadas del agricultor.

### Revocación de sesiones

Un administrador global puede cerrar las sesiones activas de otra cuenta para resolver incidentes de seguridad o acceso. La consola bloquea la revocación de la propia sesión administrativa para evitar un cierre accidental.

La acción queda registrada en auditoría.

## Directorio y cooperativas

La consola permite revisar y modificar la ficha pública existente:

- nombre oficial y marca;
- tipo de entidad;
- municipio y provincia;
- dirección y teléfono;
- web pública;
- fuente pública;
- estado de verificación.

Las URLs persistidas desde el panel deben ser HTTPS públicas y no pueden contener credenciales embebidas.

Cada modificación deja una entrada en `platform_admin_audit_log`.

## Fuentes oficiales

La sección de fuentes muestra el estado registrado de `public_data_sources`, incluyendo:

- proveedor;
- frecuencia;
- última comprobación;
- último éxito;
- error vigente;
- estado activo/inactivo.

Esta vista sirve para detectar rápidamente degradación de AEMET, RAIF, mercado, noticias y otras fuentes públicas sin mezclarla con los datos privados de agricultores.

## Auditoría

Migración: `0022_admin_audit_log.sql`.

La auditoría registra:

- usuario administrador;
- correo administrador;
- acción;
- tipo e identificador de entidad;
- resumen legible;
- metadatos mínimos;
- fecha/hora.

No deben guardarse en la auditoría:

- contraseñas;
- tokens o cookies de sesión;
- coordenadas precisas de parcelas;
- documentos privados;
- payloads agrícolas completos.

## Seguridad

Todos los endpoints `/api/v1/admin/*` de este bloque vuelven a exigir `requirePlatformAdmin` en backend y responden con `Cache-Control: private, no-store`.

La ruta visible no sustituye la autorización del servidor.

## Siguiente incremento recomendado

Después de validar este bloque:

1. gestión editorial de noticias y avisos;
2. estado detallado de trabajos/colas y backups;
3. contacto y solicitudes de soporte;
4. auditoría también para todas las acciones publicitarias existentes;
5. roles globales administrables sin depender exclusivamente de la allowlist de correo.
