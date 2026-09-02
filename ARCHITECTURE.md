# Mágina Olivo — Arquitectura inicial

## Objetivo

Construir una PWA móvil, modular y mantenible, capaz de funcionar sin IA y preparada para añadir integraciones externas de forma progresiva.

## Arquitectura lógica

```text
Usuario
  ↓
PWA Web
  ↓
API / Backend
  ├── Autenticación
  ├── Explotaciones / fincas / parcelas
  ├── Campañas
  ├── Entregas
  ├── Labores
  ├── Documentos
  ├── Cooperativas
  ├── Notificaciones
  └── Automatizaciones
         ↓
    Servicios externos
      ├── Meteorología
      ├── Mapas / SIGPAC
      ├── Correo / push
      └── IA opcional
```

## Propuesta técnica inicial

La elección concreta se cerrará antes de implementar, pero la arquitectura debe permitir:

- Frontend React + TypeScript + Vite.
- PWA instalable con service worker.
- Backend desacoplado del frontend.
- Base de datos relacional o backend equivalente con relaciones claras.
- Almacenamiento privado para documentos y fotografías.
- Tareas programadas para automatizaciones.
- API interna versionada.
- Despliegue mediante contenedores cuando aporte valor.

## Regla fundamental

El frontend nunca debe contener secretos de proveedores. Las claves de meteorología, IA, correo u otros servicios residirán únicamente en backend/secret manager.

## Dominios funcionales

### Identidad
- usuarios
- sesiones
- preferencias

### Explotación
- explotaciones
- fincas
- parcelas

### Operación agrícola
- campañas
- labores
- tratamientos
- riegos
- recolecciones

### Producción
- entregas
- rendimientos
- destinos/cooperativas

### Información
- cooperativas
- fuentes públicas
- avisos

### Evidencias
- documentos
- fotografías
- archivos adjuntos

### Automatización
- reglas
- ejecuciones
- notificaciones
- logs

### IA opcional
- solicitudes
- extracción estructurada
- conversaciones contextuales autorizadas
- auditoría de acciones propuestas

## Offline

La V1 debe contemplar conectividad irregular en campo.

Objetivo progresivo:

1. La interfaz principal carga como PWA.
2. Datos recientes de lectura pueden quedar en caché local.
3. Formularios importantes pueden conservar borradores localmente.
4. Una fase posterior podrá incorporar cola offline de escrituras con resolución de conflictos.

No se debe prometer sincronización offline completa hasta implementarla y probarla.

## Integraciones externas

Toda integración debe quedar detrás de un adapter propio.

Ejemplo:

```text
WeatherService
  ├── provider A
  └── provider B
```

Así se evita que el modelo de datos del producto dependa directamente de un proveedor.

## IA

La IA se consumirá exclusivamente desde backend.

Flujo recomendado:

```text
Usuario escribe o sube documento
        ↓
Backend valida identidad y permisos
        ↓
Prepara solo los datos necesarios
        ↓
Proveedor de IA
        ↓
Respuesta estructurada
        ↓
Validación de esquema
        ↓
Vista previa para el usuario
        ↓
Confirmación
        ↓
Escritura real en Mágina Olivo
```

La IA no escribirá directamente datos agrícolas críticos sin validación y reglas de negocio.

## Observabilidad

Desde el inicio se deberán distinguir:

- errores de aplicación;
- fallos de integraciones;
- ejecuciones de automatizaciones;
- eventos de seguridad;
- acciones administrativas;
- consumo de APIs de pago.

No registrar en logs secretos, tokens ni contenido privado completo de documentos.

## Evolución prevista

La arquitectura debe poder crecer hacia:

- múltiples miembros por explotación;
- técnicos/asesores invitados;
- cooperativas colaboradoras;
- importación automática;
- analítica avanzada;
- exportación reglamentaria;
- módulos de pago;
- aplicación móvil nativa si algún día aporta valor.
