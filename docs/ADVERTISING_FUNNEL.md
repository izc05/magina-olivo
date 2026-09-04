# Embudo comercial de publicidad V1

## Objetivo

Cerrar el circuito comercial de Mágina Olivo desde la captación pública hasta la gestión interna, manteniendo separadas la solicitud, la publicación, la contratación y el cobro.

## Rutas

### Públicas

- `/anunciate` — solicitud para empresas y profesionales.
- `GET /api/v1/public/advertising/options` — planes activos y precios comerciales cuando estén definidos.
- `POST /api/v1/public/advertising/applications` — alta de solicitud.
- `POST /api/v1/public/advertising/events` — métricas agregables de campañas patrocinadas activas.

### Administración

- `/admin/comercial` — pipeline de solicitudes, conversiones, métricas y enlaces a campaña/finanzas/directorio.
- `GET /api/v1/admin/advertising/funnel` — vista comercial.
- `POST /api/v1/admin/advertising/applications/:applicationId/convert` — convierte una solicitud en anunciante + campaña borrador y, opcionalmente, contrato borrador.

## Secuencia

1. Un negocio envía `/anunciate`.
2. Se registra `advertiser_applications` con referencia opaca `ADV-...` y consentimiento de uso de los datos para tramitar la solicitud.
3. El panel muestra la solicitud en el embudo.
4. Comercial/Superadmin puede convertirla.
5. Si no existía ficha de directorio, se crea como `stale`, por lo que no se expone en `/api/v1/public/destinations` hasta revisión.
6. Se crea `advertiser_profiles`.
7. Se crea `sponsorships` siempre con estado `draft`.
8. Si hay importe acordado explícito, puede crearse también `advertising_commercial_contracts` en `draft`.
9. La activación del patrocinio continúa como acción separada de administración.
10. Cuando un patrocinio Destacado/Premium está realmente activo y `MAGINA_ADVERTISING_ENABLED=true`, el directorio puede registrar impresiones e interacciones.
11. Los apuntes de cobro se gestionan en `/admin/finanzas`. No ejecutan pagos ni generan facturas fiscales.

## Privacidad de métricas

`advertising_events` contiene únicamente:

- anunciante;
- patrocinio;
- tipo de evento;
- municipio contextual opcional;
- placement;
- fecha;
- `client_event_id` aleatorio para deduplicar reintentos.

No debe almacenar:

- IP;
- user agent;
- cookie publicitaria;
- usuario autenticado;
- sesión;
- explotación;
- parcela;
- coordenadas precisas;
- documentos agrícolas.

El `client_event_id` cambia para cada evento y no debe reutilizarse como identificador de visitante o dispositivo.

## Eventos V1

- `impression`
- `profile_view`
- `phone_click`
- `whatsapp_click`
- `website_click`

En el directorio V1 se instrumentan impresión, teléfono, WhatsApp y web. Las métricas fallidas nunca bloquean la navegación ni la acción de contacto.

## Precios

Los precios públicos proceden de `advertising_plan_pricing`. Si `amount_cents` es `NULL`, `/anunciate` muestra **Precio a consultar**. La aplicación no inventa tarifas.

## Separación de responsabilidades

- `commercial`: embudo y finanzas internas.
- `operations`: validación posterior de nuevas fichas/directorio.
- Superadmin: conserva las acciones de publicidad global y activación de campañas existentes.

Convertir una solicitud no equivale a verificar una empresa, activar un patrocinio, recibir un pago ni emitir una factura.

## Migración

`0026_advertising_funnel.sql` añade:

- referencia pública de solicitud;
- fecha de consentimiento;
- web de negocio;
- referencias de conversión a destino/anunciante/patrocinio/contrato;
- fecha de conversión;
- `client_event_id` deduplicable para métricas.
