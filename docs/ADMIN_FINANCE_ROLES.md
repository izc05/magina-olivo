# Administración — economía de publicidad y roles V1

## Objetivo

Añadir control económico interno a la monetización de Mágina Olivo sin introducir todavía una pasarela de pago ni convertir el panel en un sistema contable/fiscal.

Rutas:

- `/admin/finanzas` — tarifas, acuerdos, cobros y renovaciones.
- `/admin/roles` — delegación administrativa progresiva.

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

La migración crea `platform_admin_memberships` con roles preparados:

- `superadmin`;
- `commercial`;
- `content`;
- `support`;
- `operations`.

### Delegación efectiva en V1

Solo `commercial` se delega de forma operativa en esta fase y permite acceder a `/api/v1/admin/finance/*` y `/admin/finanzas`.

Los roles `content`, `support` y `operations` quedan preparados en el esquema, pero los módulos existentes continúan protegidos por el Superadmin hasta que cada conjunto de endpoints sea migrado explícitamente a su permiso. Esto evita ampliar accesos accidentalmente.

## Superadmin de arranque

`MAGINA_ADMIN_EMAILS` sigue siendo la autoridad de recuperación/arranque.

Las cuentas incluidas en esa variable:

- tienen acceso Superadmin;
- no se pueden modificar desde `/admin/roles`;
- se gestionan únicamente mediante configuración segura del servidor.

El panel también bloquea el cambio de roles persistentes de la propia sesión administrativa para reducir el riesgo de bloqueo accidental.

## Auditoría

Los cambios de tarifas, acuerdos, cobros y roles se registran en `platform_admin_audit_log`.

No deben guardarse secretos, contraseñas, tokens, coordenadas agrícolas ni documentos privados dentro de los metadatos de auditoría.
