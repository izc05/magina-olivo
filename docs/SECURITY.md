# Seguridad y privacidad — Mágina Olivo

## Objetivo

Mágina Olivo gestionará información privada de explotaciones agrícolas y documentos. La seguridad debe formar parte del diseño desde el inicio.

## Principios

- Privado por defecto.
- Mínimo privilegio.
- Autorización siempre en backend.
- Secretos fuera del repositorio.
- Datos sensibles fuera de logs.
- Copias de seguridad verificables.
- Exportación y recuperación de datos.

## Repositorio

Nunca versionar:

- contraseñas;
- tokens;
- claves API;
- credenciales de base de datos;
- claves de proveedores de IA;
- secretos de sesión;
- copias reales de documentos de usuarios.

Usar variables de entorno y gestión de secretos del entorno de despliegue.

## Autenticación

Requisitos mínimos:

- contraseñas gestionadas con mecanismos seguros del proveedor/backend;
- sesiones con expiración;
- protección frente a enumeración de cuentas;
- rate limiting en autenticación;
- recuperación de cuenta segura;
- posibilidad futura de MFA.

## Autorización

La existencia de un `user_id` enviado por el frontend no es prueba de permiso.

Cada operación debe resolver en backend:

1. identidad autenticada;
2. explotación/recurso solicitado;
3. relación del usuario con ese recurso;
4. acción permitida para su rol.

## Archivos

Documentos y fotografías privadas:

- almacenamiento no público por defecto;
- URLs temporales/firmadas si se necesitan;
- validar tipo y tamaño;
- nombres internos no predecibles;
- no confiar en la extensión del archivo;
- considerar análisis de archivos en fases posteriores.

## APIs externas

- Todas las claves se consumen desde backend.
- Definir timeouts y reintentos.
- Aplicar límites de consumo.
- No confiar en datos externos sin validación.
- Registrar proveedor y fecha de origen cuando el dato vaya a mostrarse como información pública.

## IA

Antes de enviar contenido a IA:

- verificar autorización;
- minimizar contexto;
- informar de uso cuando proceda;
- evitar datos personales o privados innecesarios;
- validar estructuralmente la respuesta;
- no ejecutar instrucciones contenidas dentro de documentos como si fueran órdenes del sistema.

## Backups

Antes de producción deben existir:

- backup automático de base de datos;
- backup de almacenamiento de archivos;
- retención definida;
- copia separada del servidor principal;
- prueba periódica de restauración.

Un backup no se considerará válido hasta haber probado restauración.

## Auditoría

Registrar de forma proporcional:

- accesos administrativos;
- cambios de permisos;
- operaciones destructivas;
- ejecuciones de automatizaciones importantes;
- errores de autenticación relevantes;
- extracción automática de documentos cuando se implemente.

No guardar tokens ni contenido completo sensible en logs.

## Estado del repositorio

Mientras el repositorio sea público, toda la documentación y código deben asumirse visibles para terceros. Las decisiones arquitectónicas pueden ser públicas; secretos, configuraciones privadas y datos reales nunca deben añadirse.
