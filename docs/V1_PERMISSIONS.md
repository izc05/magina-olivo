# Modelo de permisos V1 — Mágina Olivo

Fecha: 2026-09-02
Estado: diseño

## Principio

El aislamiento se hace por explotación (`holding`), no solo por `user_id` disperso en cada tabla.

Toda petición a datos privados debe responder dos preguntas:

1. ¿A qué explotación pertenece el recurso?
2. ¿Qué permiso tiene este usuario en esa explotación?

Conocer un ID nunca concede acceso.

## Roles preparados

### owner

Propietario principal.

Puede:
- ver y editar todos los datos de la explotación;
- gestionar fincas/parcelas/campañas;
- gestionar entregas/resultados/labores/documentos;
- exportar datos;
- gestionar miembros;
- configurar integraciones;
- solicitar baja/eliminación de explotación según política aplicable.

### admin

Colaborador de confianza con administración operativa.

Puede:
- gestionar datos agrícolas;
- importar/exportar datos según permiso;
- gestionar tareas y documentos;
- invitar/gestionar colaboradores si se habilita.

No puede:
- transferir propiedad;
- eliminar definitivamente la explotación por defecto.

### collaborator

Técnico/familiar/trabajador que registra y consulta actividad.

Puede:
- ver parcelas autorizadas de la explotación;
- registrar labores;
- registrar entregas si se habilita;
- adjuntar documentos.

No puede por defecto:
- gestionar miembros;
- configurar conexiones externas;
- borrar información histórica crítica;
- exportar todo el conjunto de datos.

### viewer

Solo lectura de ámbitos autorizados.

## V1 real

Para no sobrecargar el MVP, la primera interfaz puede comenzar con un único `owner` por explotación.

Sin embargo:
- las tablas y consultas se diseñan con `holding_id`;
- se reserva `holding_members`;
- no se codifica la autorización asumiendo permanentemente `holding.owner_user_id == current_user`.

Así se evita una migración peligrosa cuando entren familiares, técnicos o gestores.

## Matriz orientativa

| Acción | owner | admin | collaborator | viewer |
|---|---:|---:|---:|---:|
| Ver dashboard | ✅ | ✅ | ✅ | ✅ |
| Crear/editar finca | ✅ | ✅ | configurable | ❌ |
| Crear/editar parcela | ✅ | ✅ | configurable | ❌ |
| Registrar labor | ✅ | ✅ | ✅ | ❌ |
| Registrar entrega | ✅ | ✅ | configurable | ❌ |
| Añadir rendimiento | ✅ | ✅ | configurable | ❌ |
| Subir documento | ✅ | ✅ | ✅ | ❌ |
| Borrar/archivar histórico | ✅ | configurable | ❌ | ❌ |
| Exportar explotación completa | ✅ | configurable | ❌ | ❌ |
| Conectar proveedor externo | ✅ | configurable | ❌ | ❌ |
| Gestionar miembros | ✅ | configurable | ❌ | ❌ |
| Transferir propiedad | ✅ | ❌ | ❌ | ❌ |

## Ámbito por parcela — futuro

Puede ser útil que un colaborador solo acceda a algunas parcelas.

No es requisito de lanzamiento, pero no bloquearlo conceptualmente.

Extensión posible:

- `member_plot_scopes`
- `member_farm_scopes`

## Documentos

La URL/clave física de un archivo no debe ser suficiente para descargarlo.

Flujo:
1. usuario solicita documento;
2. backend resuelve `document -> holding` mediante sus enlaces/propiedad;
3. comprueba membresía y permiso;
4. genera respuesta/URL temporal corta cuando proceda.

No exponer buckets privados de forma pública.

## Cooperativas

Los registros del directorio público son legibles sin mezclar permisos de explotación.

`cooperatives` y `cooperative_access_points` son información pública/curada.

En cambio:
- `deliveries`;
- `delivery_results`;
- `documents`;
- `import_batches`;
- cualquier dato del socio;

son privados aunque estén relacionados con una cooperativa pública.

Una cooperativa no obtiene acceso automático a la explotación porque el usuario la haya seleccionado como destino.

## Integraciones

Cada `external_connection` pertenece a una explotación.

Reglas:
- autorización explícita;
- scopes mínimos;
- revocable;
- logs de sincronización;
- tokens en almacén seguro;
- nunca compartir una conexión entre explotaciones por coincidencia de proveedor.

## Automatizaciones

Una regla se ejecuta con el ámbito de la explotación que la creó.

El worker no recibe privilegios globales innecesarios.

Cada ejecución registra:
- rule_id;
- holding_id resoluble;
- resultado;
- error técnico sin datos sensibles excesivos.

## Administración de plataforma

No confundir `admin de Mágina Olivo` con `admin de explotación`.

El soporte/plataforma no debe tener por defecto una interfaz que permita navegar libremente por datos productivos privados.

Si en el futuro existe acceso de soporte excepcional:
- debe estar justificado;
- tener permiso temporal/específico;
- quedar auditado;
- aplicar mínimo privilegio.

## Pruebas obligatorias

Antes del piloto, crear tests de autorización:

- usuario A no lista holdings de B;
- A no puede consultar finca de B por ID;
- A no puede descargar documento de B;
- A no puede modificar entrega de B;
- A no puede consultar resultados de B;
- un viewer no puede escribir;
- un collaborator no puede elevar su rol;
- un token de integración de A no puede usarse para B;
- URLs temporales expiran;
- registros públicos de cooperativas siguen accesibles sin filtrar datos privados.

## Regla de aceptación

No se declara V1 lista si el aislamiento multi-explotación solo depende de controles del frontend.

La autorización debe imponerse en backend/base de datos/API.
