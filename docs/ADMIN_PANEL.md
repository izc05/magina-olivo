# Mágina Olivo — Panel privado de administración V1

## Objetivo

Mágina Olivo dispone de un panel de gestión separado de la experiencia del agricultor. Su URL lógica es `/admin` y todas sus operaciones sensibles se autorizan de nuevo en backend.

El rol `admin` de una explotación **no** concede acceso a este panel. La administración global de la plataforma es un permiso independiente.

## Acceso

El servidor autoriza únicamente cuentas Better Auth cuyo correo aparezca en la variable de entorno:

```text
MAGINA_ADMIN_EMAILS=administrador@dominio.example,otro-admin@dominio.example
```

Reglas:

- comparación exacta y sin distinguir mayúsculas/minúsculas;
- lista vacía = ningún administrador global autorizado;
- no introducir correos reales, secretos ni credenciales en el repositorio;
- configurar la lista únicamente en el entorno/secret store del servidor;
- conocer la ruta `/admin` no proporciona acceso;
- los endpoints `/api/v1/admin/*` vuelven a comprobar sesión y autorización en backend;
- las respuestas administrativas usan `private, no-store`.

La normalización de la allowlist se mantiene en una política pura independiente del runtime de Better Auth para poder probarla sin abrir conexiones de base de datos.

## Alcance funcional V1

### Cuadro de mando

Muestra de forma agregada:

- usuarios con explotación activa;
- explotaciones;
- fincas;
- parcelas;
- campañas abiertas;
- entradas del directorio;
- anunciantes activos;
- patrocinios activos;
- solicitudes comerciales pendientes;
- eventos publicitarios de los últimos 30 días;
- estado básico de API y PostgreSQL.

No muestra ni expone datos agrícolas privados de una explotación concreta.

### Publicidad y monetización

El panel reutiliza el modelo de `0021_advertising_core.sql` y permite:

- consultar anunciantes y campañas;
- crear o actualizar un perfil comercial asociado a una ficha del directorio;
- seleccionar categoría;
- seleccionar plan `free`, `featured` o `premium`;
- definir etiqueta pública, descripción y datos de contacto;
- programar inicio y fin;
- activar o pausar patrocinios;
- consultar impresiones y clics agregados de 30 días;
- revisar solicitudes de anunciantes y aprobarlas o rechazarlas.

Al activar un nuevo patrocinio para un anunciante, cualquier otro patrocinio activo de ese anunciante se pausa para evitar dos campañas activas simultáneas.

## Separación editorial y comercial

La publicidad es únicamente visibilidad comercial. Nunca puede modificar, ponderar ni condicionar:

- precios y datos objetivos del mercado del aceite;
- meteorología;
- alertas de campo;
- noticias editoriales;
- datos privados de agricultores, parcelas o campañas.

El contenido pagado debe seguir identificado de forma visible como `Patrocinado` u otra etiqueta comercial equivalente.

## Privacidad de métricas

`advertising_events` se usa para analítica comercial agregada. No se deben persistir ahí:

- direcciones IP;
- identificadores de usuarios;
- identificadores de explotaciones;
- coordenadas precisas de parcelas;
- datos agrícolas privados.

## Staging y producción

La visibilidad publicitaria permanece apagada por defecto:

```text
MAGINA_ADVERTISING_ENABLED=false
```

Durante el piloto de MiniPC/staging se puede probar el panel y preparar campañas sin hacerlas visibles públicamente. La publicidad se activa únicamente en un entorno post-staging explícito y después de revisar los datos comerciales.

## Ampliaciones previstas

La interfaz deja preparadas las ramas de gestión para:

- usuarios y soporte;
- directorio/cooperativas;
- noticias;
- alertas y avisos;
- mercado del aceite y fuentes;
- legal, privacidad y contacto;
- copias de seguridad y observabilidad.

Cada ampliación deberá mantener autorización server-side y separación entre información pública, datos comerciales y datos privados de explotaciones.
