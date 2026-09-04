# Administración — economía de publicidad y roles V1

## Objetivo

Añadir control económico interno a la monetización de Mágina Olivo sin introducir todavía una pasarela de pago ni convertir el panel en un sistema contable/fiscal.

Rutas:

- `/admin/finanzas` — tarifas, acuerdos, cobros y renovaciones.
- `/admin/roles` — delegación administrativa por responsabilidad.

## Precios de planes

La migración `0025_admin_finance_roles.sql` crea `advertising_plan_pricing` para `free`, `featured` y `premium`.

Los importes iniciales son **NULL**. La aplicación muestra `Por definir` hasta que un administrador autorizado decida la tarifa. No se fija ningún precio comercial desde código o migración.

## Acuerdos comerciales

`advertising_commercial_contracts` registra:

- anunciante;
- patrocinio relacionado, cuando existe;
- plan;
- importe acordado;
- periodicidad;
- estado;
- inicio/fin;
- próxima renovación;
- referencia y notas internas.

Los acuerdos son control comercial interno. No sustituyen contratos jurídicos firmados fuera de la aplicación.

## Cobros y facturación interna

`advertising_billing_entries` permite controlar:

- pendiente;
- emitido;
- pagado;
- vencido;
- cancelado;
- devuelto.

Marcar un registro como `paid` **no ejecuta un pago**, no consulta una entidad bancaria y no demuestra por sí solo que el dinero se haya recibido. Solo registra el estado administrativo indicado por una persona autorizada.

Este módulo tampoco genera una factura fiscal válida. Si en el futuro se necesita facturación fiscal o una pasarela, deberá implementarse como integración separada con sus requisitos legales y técnicos.

## Indicadores

El panel calcula:

- contratos activos;
- MRR equivalente para contratos recurrentes;
- cobrado en el mes;
- cobrado en el año;
- pendiente de cobro;
- apuntes vencidos;
- renovaciones previstas en 30 días.

Los pagos únicos no se convierten artificialmente en MRR.

## Roles administrativos

La migración crea `platform_admin_memberships` con los roles:

- `superadmin`;
- `commercial`;
- `content`;
- `support`;
- `operations`.

### Delegación efectiva

Los cuatro roles delegados ya tienen alcance operativo y limitado:

- `commercial`: economía de publicidad, contratos, cobros y renovaciones;
- `content`: noticias, destacados, alertas agregadas y avisos de plataforma;
- `support`: tickets, prioridad y notas internas;
- `operations`: directorio, fuentes, auditoría resumida y evidencias operativas.

La autorización se aplica endpoint por endpoint en servidor. Disponer de un rol no concede acceso a los demás módulos.

Legal, usuarios globales, cierre de sesiones, activación pública de campañas y gestión de roles continúan reservados a Superadmin en esta fase.

Los límites detallados se documentan en `docs/ADMIN_DELEGATED_ROLES.md`.

## Superadmin de arranque y persistente

`MAGINA_ADMIN_EMAILS` sigue siendo la autoridad de recuperación/arranque. Además, un rol persistente `superadmin` recibe la misma autoridad sobre los módulos administrativos.

Las cuentas incluidas en `MAGINA_ADMIN_EMAILS`:

- tienen acceso Superadmin;
- no se pueden modificar desde `/admin/roles`;
- se gestionan únicamente mediante configuración segura del servidor.

La interfaz también protege la sesión administrativa actual y los Superadmin persistentes contra cambios accidentales desde la tabla normal de delegación.

## Auditoría

Los cambios de tarifas, acuerdos, cobros, roles y operaciones delegadas se registran en `platform_admin_audit_log`.

No deben guardarse secretos, contraseñas, tokens, coordenadas agrícolas ni documentos privados dentro de los metadatos de auditoría.
