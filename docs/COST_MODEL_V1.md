# Modelo de costes V1 — Mágina Olivo

Fecha: 2026-09-02

## Objetivo

Evitar diseñar una aplicación cuyo coste operativo crezca antes de validar el producto.

Las cifras externas deben revisarse antes de producción comercial.

## Principio

V1 debe poder funcionar con coste variable muy bajo porque:

- la IA no forma parte del núcleo;
- AEMET OpenData es una fuente de datos abierta/gratuita para los datos incluidos en su catálogo;
- RAIF es dato abierto;
- la lógica de kilos/rendimientos se ejecuta localmente en nuestro backend;
- la infraestructura puede desplegarse en servidor propio o trasladarse después a gestionado.

## Componentes

### 1. Frontend/PWA

Coste de cómputo marginal bajo.

Puede servirse desde:
- servidor propio;
- CDN/hosting estático;
- infraestructura de la API.

No necesita un runtime de IA.

### 2. API + PostgreSQL

Dos escenarios:

#### Piloto self-hosted

Coste incremental potencialmente muy bajo si ya existe infraestructura disponible.

Aun así contabilizar:
- electricidad;
- SSD/almacenamiento;
- backups externos;
- dominio si se compra uno específico;
- correo transaccional si se usa.

#### Producción gestionada

Coste depende del proveedor y SLA seleccionado.

No fijar una cifra falsa en el diseño. Estimar cuando conozcamos:
- usuarios activos;
- tamaño de base de datos;
- número de documentos;
- necesidad de alta disponibilidad.

### 3. Documentos — Cloudflare R2 candidato

Precios oficiales revisados el 02/09/2026 para clase Standard:

- almacenamiento: $0.015/GB-mes;
- Class A: $4.50/millón de operaciones;
- Class B: $0.36/millón de operaciones;
- egress directo: sin cargo;
- free tier mensual Standard: 10 GB-mes, 1 millón Class A, 10 millones Class B.

Consecuencia: un piloto pequeño de tickets/fotos podría mantenerse dentro del free tier, pero no debemos asumirlo sin medir tamaño real de archivos.

### Ejemplo de capacidad, no factura

Si después de compresión/evidencia cada imagen ocupase 500 KB de media:

- 1.000 imágenes ≈ 0,5 GB;
- 10.000 imágenes ≈ 5 GB;
- 20.000 imágenes ≈ 10 GB.

Los PDFs originales pueden variar mucho más.

La aplicación debe registrar `size_bytes` para medir consumo real por usuario/campaña.

### 4. AEMET

Los datos indicados por AEMET OpenData pueden descargarse gratuitamente.

Costes nuestros:
- llamadas/CPU de ingesta;
- almacenamiento de caché/snapshots;
- operación de rotación de API Key.

No realizar peticiones por usuario. Cachear por localización/ventana.

### 5. RAIF

Dataset abierto CC BY 4.0.

Costes nuestros:
- descarga periódica;
- parsing XML;
- almacenamiento de normalización/snapshots;
- pruebas de cambios de esquema.

No hay necesidad de enviar cada consulta del usuario a una API de pago.

### 6. SIGPAC

La reutilización está condicionada por las licencias publicadas por Junta de Andalucía y requiere atribución.

El coste principal inicial será de implementación/procesamiento, no una llamada de IA.

Si en el futuro se contrata un proveedor de mapas/base tiles, presupuestarlo de forma separada del dato SIGPAC.

### 7. Correo

Necesidades iniciales:
- verificación de cuenta;
- recuperación de contraseña;
- avisos administrativos importantes.

Evitar enviar resúmenes masivos por email en piloto si el centro de notificaciones de la PWA es suficiente.

Elegir proveedor cuando conozcamos volumen y revisar su free tier/precio en ese momento.

### 8. Push

Preferir Web Push estándar si cumple UX y compatibilidad.

No contratar plataforma de notificaciones hasta demostrar necesidad.

### 9. IA futura

Coste estrictamente variable y con límites por usuario.

No usar IA para:
- dashboard;
- sumar kilos;
- rendimiento ponderado;
- meteorología;
- recordatorios;
- detección de vencimientos;
- filtros/búsqueda normal.

Funciones IA podrían consumir presupuesto solo cuando el usuario las solicita:
- leer ticket;
- convertir voz/texto en labor;
- consulta avanzada;
- resumen generado.

Registrar:
- función;
- proveedor/modelo lógico;
- tokens/unidades de coste;
- resultado éxito/error;
- coste estimado.

Permitir límite mensual y kill switch.

## Escenarios de piloto

### P0 — 5 agricultores

Objetivo: validar UX.

Esperable:
- base de datos pequeña;
- cientos de registros;
- decenas/cientos de documentos;
- costes externos cercanos al mínimo del proveedor elegido.

### P1 — 50 agricultores

Objetivo: validar campaña real y sincronización.

Medir:
- documentos por agricultor;
- MB por campaña;
- llamadas AEMET consolidadas;
- jobs diarios;
- correos/usuario;
- errores offline.

### P2 — 500 agricultores

Antes de llegar aquí revisar:
- backups y restauración;
- tamaño Postgres;
- object storage;
- observabilidad;
- rate limits externos;
- soporte;
- coste de email/push;
- necesidad de alta disponibilidad.

## Métricas económicas internas

Desde piloto almacenar métricas agregadas no sensibles:
- `documents_count`;
- `documents_bytes`;
- uploads/day;
- external_api_calls` por adapter;
- weather_cache_hit_ratio;
- jobs/day;
- email_count;
- AI_requests` cuando exista;
- average sync retries.

## Regla de lanzamiento

No fijar precio al usuario basándonos solo en hosting.

El precio futuro debe reflejar valor, soporte, mantenimiento, integración y riesgo operativo. El coste técnico sirve para comprobar margen, no para decidir por sí solo el precio de producto.

## Fuentes de precio revisadas

- Cloudflare R2 Pricing: https://developers.cloudflare.com/r2/pricing/
- AEMET OpenData: https://opendata.aemet.es/

Revisar de nuevo antes de cualquier lanzamiento comercial.