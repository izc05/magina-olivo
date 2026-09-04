# Mágina Olivo — Notificaciones comerciales del anunciante

## Objetivo

Dar continuidad al Área del Anunciante con avisos comerciales propios de Mágina Olivo, totalmente separados de las alertas agrícolas, meteorológicas y oficiales.

## Canales

### Dentro de `/anunciante`

Siempre disponible para una cuenta con membresía activa sobre el anunciante.

Cada usuario conserva su propio estado leído/no leído aunque varias personas gestionen el mismo negocio.

### Correo comercial

Es opcional por usuario y por anunciante.

- `email_enabled` nace en `false`.
- `COMMERCIAL_MAIL_TRANSPORT` nace en `disabled`.
- no se reutiliza automáticamente `AUTH_MAIL_TRANSPORT`.
- para envío real se requiere configurar explícitamente:
  - `COMMERCIAL_MAIL_TRANSPORT=resend`
  - `RESEND_API_KEY`
  - `COMMERCIAL_MAIL_FROM`
  - `BETTER_AUTH_URL` como URL base del portal.

Activar la preferencia de correo en la UI no fuerza ni simula un envío si el transporte sigue deshabilitado.

## Avisos inmediatos

Se crean transaccionalmente en PostgreSQL mediante triggers de la migración `0028_advertiser_notifications.sql`.

### Alta publicitaria aprobada

Cuando una solicitud se convierte por primera vez en anunciante/campaña borrador:

- tipo `application_approved`;
- visible para los miembros actuales o futuros del negocio;
- recuerda que la campaña sigue en borrador y que publicar es una acción independiente.

### Cambio de ficha aprobado

Cuando una solicitud de cambio pasa de `pending` a `approved`:

- tipo `profile_change_approved`;
- dirigido al usuario que presentó el cambio.

### Cambio de ficha rechazado

Cuando pasa de `pending` a `rejected`:

- tipo `profile_change_rejected`;
- dirigido al usuario que presentó el cambio.

## Avisos periódicos

El worker ejecuta el escaneo comercial desde su ciclo durable periódico. El escaneo ocurre antes del acceso a AEMET, por lo que la generación de avisos comerciales no depende de que el proveedor meteorológico responda correctamente.

Los eventos son idempotentes mediante `event_key` único.

### Campaña próxima a finalizar

- menos de 30 días;
- refuerzo a menos de 7 días;
- solo campañas `active` con `ends_at` futuro.

### Renovación próxima

- menos de 30 días;
- refuerzo a menos de 7 días;
- solo contratos `active` con `renewal_at` futuro.

### Cobro próximo a vencer

- menos de 7 días;
- apuntes `pending` o `issued` con `due_at` futuro.

### Cobro con fecha vencida

- `due_at <= now()`;
- apuntes `pending`, `issued` u `overdue`.

El texto deja claro que el estado es control comercial interno y no acredita una deuda bancaria ni constituye factura fiscal.

## Privacidad

Las notificaciones no incluyen:

- IP del visitante;
- identificador del agricultor visitante;
- sesión del visitante;
- explotación;
- parcela;
- coordenadas;
- entregas agrícolas;
- documentos privados.

El acceso a cada aviso se valida contra `advertiser_portal_memberships`.

Un aviso puede ser:

- de empresa (`target_user_id = null`), visible para miembros activos;
- individual (`target_user_id`), visible únicamente para ese usuario dentro del anunciante.

## Tablas

Migración `0028_advertiser_notifications.sql`:

- `advertiser_notifications`
- `advertiser_notification_reads`
- `advertiser_notification_preferences`
- `advertiser_notification_email_deliveries`

## API privada

- `GET /api/v1/advertiser/notifications?advertiserId=...`
- `POST /api/v1/advertiser/notifications/:notificationId/read`
- `GET /api/v1/advertiser/notification-preferences?advertiserId=...`
- `PATCH /api/v1/advertiser/notification-preferences?advertiserId=...`

Todas las respuestas usan `Cache-Control: private, no-store`.

## Principios no negociables

1. Un aviso comercial nunca se presenta como aviso AEMET, RAIF, Protección Civil ni emergencia.
2. El correo no se habilita por defecto.
3. Configurar correo no habilita pagos ni facturación.
4. No existe auto-renovación ni auto-cobro.
5. No existe acceso cruzado entre anunciantes.
6. Un fallo de correo no elimina la notificación disponible dentro del portal.
