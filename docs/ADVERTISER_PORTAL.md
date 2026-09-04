# Área del Anunciante — V1

## Objetivo

Permitir que una empresa anunciante consulte su presencia comercial en Mágina Olivo sin entrar en el panel administrativo ni acceder a información agrícola privada.

## Rutas

- `/anunciante` — portal del negocio.
- `/admin/anunciantes` — consola Comercial/Superadmin para accesos y moderación.

## Acceso

El acceso es explícito mediante `advertiser_portal_memberships`.

Roles del negocio:

- `owner`: consulta y puede proponer cambios.
- `editor`: consulta y puede proponer cambios.
- `viewer`: solo consulta.

Estos roles no son roles administrativos y nunca conceden acceso a `/admin`.

Conocer el correo de contacto de una empresa no otorga acceso automáticamente. El equipo Comercial/Superadmin debe vincular una cuenta registrada de Mágina Olivo al `advertiser_id` correcto.

## Información visible para el anunciante

Solo del anunciante al que pertenece la membresía:

- nombre y ficha comercial;
- estado y plan de campaña;
- fechas de inicio/fin;
- impresiones e interacciones agregadas de 30 y 90 días;
- llamadas, WhatsApp y clics web agregados;
- contrato comercial asociado;
- renovación/finalización;
- apuntes de cobro del contrato;
- último estado de una solicitud de cambio de ficha.

No se muestran:

- usuarios globales;
- fincas;
- parcelas;
- entregas;
- documentos agrícolas;
- coordenadas;
- datos de otros anunciantes;
- auditoría administrativa global.

## Métricas

Las métricas reutilizan `advertising_events` y siguen la política ya definida:

- sin IP;
- sin usuario visitante;
- sin sesión visitante;
- sin holding/explotación;
- sin parcela;
- sin coordenadas precisas.

Los datos mostrados al anunciante son agregados.

## Cambios de ficha

El anunciante no modifica directamente el contenido público.

`owner` o `editor` crea una fila en `advertiser_profile_change_requests` con estado `pending`.

Comercial/Superadmin puede:

- aprobar;
- rechazar;
- añadir nota de revisión.

Solo una aprobación actualiza `advertiser_profiles`.

Los cambios disponibles en V1 son:

- descripción;
- teléfono;
- WhatsApp;
- URL pública HTTPS de logo;
- URL pública HTTPS de imagen principal.

La ficha institucional/directorio, verificación, prioridad, plan y activación de campaña quedan fuera del autoservicio.

## Gestión Comercial

`/admin/anunciantes` permite:

- elegir anunciante convertido;
- vincular una cuenta registrada por email;
- asignar `owner`, `editor` o `viewer`;
- revocar una membresía;
- revisar solicitudes de cambio de ficha.

Todas las altas/bajas de acceso y revisiones quedan en la auditoría administrativa.

## Cobros

El portal puede mostrar el estado interno de `advertising_billing_entries` asociado al contrato del anunciante.

Ese estado:

- no ejecuta pagos;
- no prueba un movimiento bancario;
- no sustituye una factura fiscal.

## Seguridad

- autenticación mediante la sesión Better Auth normal;
- aislamiento server-side por `(advertiser_id, user_id)`;
- respuestas privadas con `Cache-Control: private, no-store`;
- `viewer` no puede enviar cambios;
- no existe ninguna llamada del portal a endpoints `/api/v1/admin/*`;
- cambios públicos siempre moderados.

## Migración

`db/migrations/0027_advertiser_portal.sql`

Añade:

- `advertiser_portal_memberships`;
- `advertiser_profile_change_requests`;
- índices de acceso y pendientes.

## Activación recomendada en piloto

1. Registrar una cuenta sintética de anunciante.
2. Vincularla desde `/admin/anunciantes`.
3. Entrar en `/anunciante`.
4. Verificar aislamiento con una segunda empresa sintética.
5. Enviar una solicitud de cambio.
6. Confirmar que la web pública no cambia antes de aprobar.
7. Aprobar desde Comercial y comprobar actualización.
8. Revocar el acceso y confirmar `403` al intentar consultar ese anunciante.
