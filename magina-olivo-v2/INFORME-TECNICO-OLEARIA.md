# Informe Técnico — Olearia Agritech
## Análisis exhaustivo de stack, arquitectura y estructura

**Fecha:** 2026-11-09  
**Objetivo:** Documentar la arquitectura técnica completa de `agritech.olearia.io` como referencia para construir **Mágina Olivo v2**.  
**Autor:** Análisis automatizado con Claude Code  

---

## 1. Stack Tecnológico Principal

| Capa | Tecnología | Versión / Detalle |
|------|-----------|-------------------|
| **Framework** | React 18 | `createRoot` API (detectado `__reactContainer$*` fiber key) |
| **Bundler** | Vite + Rolldown | Runtime `rolldown-runtime-DxSHRdoi.js`, bundles en `/assets/` con hash |
| **Estilos** | Tailwind CSS | Clases utility-first (112+ clases Tailwind detectadas) |
| **UI Library** | shadcn/ui + Radix UI | Primitives Radix (`data-state`, `data-radix-*`), CSS variables, patrón `cn()` |
| **Iconos** | Lucide React | Chunks individuales por icono (`createLucideIcon-*.js`) |
| **Estado servidor** | TanStack Query (React Query) | Vendor chunk `vendor-query-*.js` |
| **Estado cliente** | Zustand (probable) | Patrón `*Store` en chunks (`authStore`, `activeMillStore`) |
| **HTTP Client** | Axios | Chunk `axiosInstance-*.js` |
| **Hybrid App** | Capacitor | Plugins: `CapacitorCookies`, `CapacitorHttp`, `SystemBars`, `Haptics` |
| **PWA** | Workbox | Service Worker `sw.js` activo, `workbox-window.prod.es5-*.js` |
| **Monitoring** | Sentry | `sentry.javascript.react/10.64.0`, ingest EU (`o4511609697402880.ingest.de.sentry.io`) |
| **Analytics** | PostHog | EU instance (`eu.i.posthog.com`), surveys module |
| **Tipografías** | Inter, Outfit, DM Sans, JetBrains Mono | Variable fonts (woff2) |
| **Lenguaje** | TypeScript (inferido) | Nomenclatura de chunks y patrones de código consistentes con TS |

### 1.1 Conclusión sobre el stack

**No es React Native.** Es una **SPA React 18** empaquetada con **Vite/Rolldown**, estilizada con **Tailwind CSS + shadcn/ui**, que se distribuye como:
- **Web (PWA):** Navegador estándar con Service Worker Workbox
- **Android/iOS (APK):** Envuelta con **Capacitor** (no React Native, no Cordova, no Ionic)

Capacitor permite usar la misma base de código web y acceder a APIs nativas (Haptics, StatusBar, Cookies HTTP, etc.) mediante plugins bridge.

---

## 2. Arquitectura de la Aplicación

### 2.1 Punto de entrada

```
index.html
  ├── <div id="root"></div>          ← React mount point
  ├── <script type="module" src="/assets/index-[hash].js">  ← Main bundle (Vite)
  └── <link rel="stylesheet" href="/assets/index-[hash].css"> ← Tailwind compiled CSS
```

### 2.2 Estrategia de bundling (Code Splitting)

El build produce ~78+ chunks JavaScript organizados en:

| Categoría | Ejemplos | Función |
|-----------|----------|---------|
| **Core** | `index-*.js`, `rolldown-runtime-*.js` | Entry point + module runtime |
| **Vendors** | `vendor-react-*.js`, `vendor-query-*.js`, `vendor-sentry-*.js` | Dependencias pesadas separadas |
| **Librerías** | `dist-*.js` (×4), `esm-*.js` | Paquetes npm (Radix, etc.) |
| **Dominio** | `campaign-*.js`, `labor-*.js`, `farmSurface-*.js` | Lógica de negocio por entidad |
| **State/Hooks** | `authStore-*.js`, `useFarms-*.js`, `useAccountRoles-*.js` | Stores y hooks de datos |
| **Utilidades** | `localDate-*.js`, `textFormat-*.js`, `validateNIF-*.js` | Funciones helper |
| **UI** | `Card-*.js`, `input-*.js`, `primitives-*.js` | Componentes reutilizables |
| **Iconos** | `archive-*.js`, `calendar-days-*.js` (~20+) | Un chunk por icono Lucide |
| **PWA** | `workbox-window.prod.es5-*.js` | Service Worker manager |

### 2.3 Estructura DOM

```
<html lang="es">
  <body>
    <div id="root">
      <a href="#main-content" class="sr-only focus:...">  ← Skip link (accesibilidad)
      <div class="flex flex-col h-screen w-full bg-background overflow-hidden">
        ├── [Sidebar / Navigation]
        ├── <main class="flex-1 overflow-y-auto overflow-x-hidden pb-20 sm:pb-6">
        │     └── [Page Content]
        └── [Bottom Navigation (mobile)]
      </div>
    </div>
  </body>
</html>
```

---

## 3. Sistema de Rutas (Client-Side Routing)

### 3.1 Router

React Router (contexto con `location` object detectado). SPA con navegación client-side.

### 3.2 Rutas principales identificadas

| Ruta | Sección | Descripción |
|------|---------|-------------|
| `/dashboard` | Inicio | Panel principal con resumen, meteo, precios, tareas |
| `/portfolio` | Mis Fincas | Gestión de fincas, parcelas, cosechas, dinero |
| `/field-book` | Cuaderno de Campo | Registro oficial, abonado, almacén, cumplimiento |
| `/asistente` | El Año | Asistente fenológico, tratamientos, calendario |
| `/centro-datos` | Centro de Datos | CRUD de todas las entidades (30+ subsecciones) |
| `/cuenta` | Mi Cuenta | Perfil, equipo, plan, ajustes |
| `/connect` | Conexiones | Solicitudes de conexión, integraciones |
| `/notifications` | Notificaciones | Centro de notificaciones |

### 3.3 Subrutas del Centro de Datos

Agrupadas por categoría:

**INFRAESTRUCTURA:**
- `/centro-datos/fincas` — Fincas (Todo/Cultivo/Catastro/SIGPAC/Titularidad/Riego/Zonas/SIEX)
- `/centro-datos/recintos` — Recintos SIGPAC
- `/centro-datos/trabajadores` — Trabajadores y empresas
- `/centro-datos/maquinaria` — Maquinaria

**ACTIVIDAD:**
- `/centro-datos/jornales` — Jornales (partes de trabajo)
- `/centro-datos/operaciones` — Operaciones con sub-tipos:
  - Fitosanitarios, Fertilizaciones, Riegos, Labores, Podas, Ecorégimen, Recolección
  
**PRODUCCIÓN:**
- `/centro-datos/estimaciones` — Estimaciones de cosecha
- `/centro-datos/cosechas` — Cosechas reales
- `/centro-datos/entregas` — Entregas a almazara
- `/centro-datos/existencias` — Existencias de aceite
- `/centro-datos/almacen` — Almacén de insumos

**FINANZAS:**
- `/centro-datos/costes` — Libro de costes
- `/centro-datos/ingresos` — Libro de ingresos
- `/centro-datos/gastos` — Gastos directos
- `/centro-datos/gastos-fijos` — Gastos fijos
- `/centro-datos/movimientos` — Movimientos
- `/centro-datos/liquidaciones` — Liquidaciones
- `/centro-datos/facturas` — Facturas

**CUMPLIMIENTO LEGAL:**
- `/centro-datos/documentos` — Documentos
- `/centro-datos/contratos` — Mis contratos
- `/centro-datos/siex` — Envíos a SIEX
- `/centro-datos/pac` — Declaraciones PAC
- `/centro-datos/planes-abonado` — Planes de abonado
- `/centro-datos/carnes` — Carnés de aplicador
- `/centro-datos/concesiones-agua` — Concesiones de agua
- `/centro-datos/contadores-agua` — Contadores de agua
- `/centro-datos/lecturas-agua` — Lecturas de agua

---

## 4. API Backend

### 4.1 Estructura general

- **Base URL:** `https://agritech.olearia.io/api/v1/`
- **Autenticación:** Sesión basada en cookies (no JWT bearer visible)
- **Formato:** JSON
- **Patrón batch:** Endpoint `/api/v1/batch?u=...&u=...` que agrupa múltiples peticiones GET

### 4.2 Endpoints identificados

#### Autenticación
| Método | Endpoint | Función |
|--------|----------|---------|
| GET | `/auth/session` | Validar sesión activa |
| GET | `/auth/me` | Datos del usuario autenticado |

#### App Shell
| Método | Endpoint | Función |
|--------|----------|---------|
| GET | `/app/shell?client=web` | Configuración de la app (shell data) |

#### Home / Dashboard
| Método | Endpoint | Función |
|--------|----------|---------|
| GET | `/home/bootstrap?client=web` | Datos iniciales del dashboard |
| GET | `/home/conditions?client=web&farm_id=...&latitude=...&longitude=...` | Condiciones meteorológicas y fitosanitarias |

#### Billing
| Método | Endpoint | Función |
|--------|----------|---------|
| GET | `/billing/plan` | Plan de suscripción actual |
| GET | `/billing/store` | Tienda / opciones de upgrade |

#### Portfolio (Fincas y datos agrícolas)
| Método | Endpoint | Función |
|--------|----------|---------|
| GET | `/portfolio/farms` | Lista de fincas |
| GET | `/portfolio/stakeholders?role=mill_link&only_active=true` | Almazaras vinculadas |
| GET | `/portfolio/treatment-orders?status=issued` | Órdenes de tratamiento |
| GET | `/portfolio/advisory-contracts` | Contratos de asesoría |
| GET | `/portfolio/field-operations?limit=50` | Operaciones de campo |
| GET | `/portfolio/field-operations?campaign=2027/28` | Operaciones por campaña |
| GET | `/portfolio/field-operations?date_from=2026-08-11&limit=200` | Operaciones desde fecha |
| GET | `/portfolio/workers/workdays?date_from=2026-08-11&limit=200` | Jornadas de trabajo |
| GET | `/portfolio/workers/workdays/summary?campaign=2027/28` | Resumen jornadas por campaña |
| GET | `/portfolio/workers?active_only=true` | Trabajadores activos |
| GET | `/portfolio/worker-parts?status=submitted` | Partes de trabajo enviados |
| GET | `/portfolio/tasks` | Tareas pendientes |
| GET | `/portfolio/harvests` | Cosechas |
| GET | `/portfolio/deliveries` | Entregas |
| GET | `/portfolio/fertilization-plans?active_only=false` | Planes de fertilización |
| GET | `/portfolio/input-warehouse/alerts/active` | Alertas almacén activas |
| GET | `/portfolio/input-warehouse?input_type=fitosanitario` | Almacén fitosanitarios |
| GET | `/portfolio/waste-deliveries` | Entregas de residuos |
| GET | `/portfolio/maturity-samples/harvest-safety` | Muestras madurez / seguridad cosecha |
| GET | `/portfolio/applicators?active_only=true&expiring_soon=false` | Aplicadores |
| GET | `/portfolio/stock?kind=physical` | Stock físico |
| GET | `/portfolio/equipment?active_only=true` | Equipamiento activo |
| GET | `/portfolio/organizations/mine/companies` | Empresas de la organización |
| GET | `/portfolio/agreements` | Acuerdos |
| GET | `/portfolio/advisors?active_only=true&with_valid_contract=false` | Asesores |
| GET | `/portfolio/connection-requests/sent` | Solicitudes de conexión enviadas |
| GET | `/portfolio/mills` | Almazaras |
| GET | `/portfolio/service-orders` | Órdenes de servicio |
| GET | `/portfolio/data-requests` | Solicitudes de datos |
| GET | `/portfolio/pac/declarations` | Declaraciones PAC |
| GET | `/portfolio/dat-periods/status` | Estado períodos DAT |
| GET | `/portfolio/live-tracking/crew` | Seguimiento en vivo de cuadrilla |
| GET | `/portfolio/home/crew` | Cuadrilla en dashboard |
| GET | `/portfolio/passport/overview` | Pasaporte olivar (resumen) |

#### SIEX (Sistema de Información de Explotaciones)
| Método | Endpoint | Función |
|--------|----------|---------|
| GET | `/siex/authorization?ccaa=andalucia` | Autorización SIEX Andalucía |
| GET | `/siex/status?ccaa=andalucia` | Estado envíos SIEX |

#### Messaging
| Método | Endpoint | Función |
|--------|----------|---------|
| GET | `/messaging/threads` | Hilos de mensajes |

#### Notifications
| Método | Endpoint | Función |
|--------|----------|---------|
| GET | `/notifications/unread-count` | Conteo no leídas |

#### Connect
| Método | Endpoint | Función |
|--------|----------|---------|
| GET | `/connect/requests` | Solicitudes de conexión recibidas |

#### Portfolio Objections
| Método | Endpoint | Función |
|--------|----------|---------|
| GET | `/portfolio-objections` | Objeciones sobre datos |

### 4.3 Patrón Batch API

La aplicación usa un endpoint especial de **batch** que agrupa múltiples peticiones GET en una sola llamada HTTP:

```
GET /api/v1/batch?u=/portfolio/farms&u=/messaging/threads&u=/portfolio/stakeholders?only_active=true&role=mill_link&...
```

Esto reduce significativamente el número de round-trips al servidor. Se observan batches de hasta 12 sub-peticiones en una sola llamada.

---

## 5. PWA y Capacitor

### 5.1 Progressive Web App

```json
{
  "name": "Olearia Agritech App",
  "short_name": "Agritech",
  "description": "Gestión de fincas, cosechas y cuaderno de campo digital para olivares",
  "display": "standalone",
  "display_override": ["window-controls-overlay", "standalone", "minimal-ui"],
  "orientation": "portrait",
  "start_url": "/?source=pwa",
  "lang": "es",
  "categories": ["business", "productivity", "utilities"],
  "theme_color": "#2f2d27",
  "background_color": "#ffdf00"
}
```

- **Service Worker:** Workbox (estrategias de cache preconfigured)
- **Splash screens:** Múltiples resoluciones Apple (`apple-splash-*`)
- **Iconos:** Android (48→512), iOS (192, 512), Apple Touch Icon

### 5.2 Capacitor (App nativa)

- **Plataforma web:** Detecta `web` como plataforma actual
- **Plugins registrados:** `CapacitorCookies`, `CapacitorHttp`, `SystemBars`, `Haptics`
- **En nativo (Android/iOS):** Acceso a vibración háptica, barras de sistema, HTTP nativo, cookies nativas
- **useHaptic hook:** Chunk dedicado para feedback háptico en la interfaz

---

## 6. Design System (Design Tokens)

### 6.1 CSS Custom Properties (HSL)

```css
:root {
  /* Colores principales */
  --background: 240 21% 95%;      /* Gris claro azulado */
  --foreground: 240 10% 12%;      /* Casi negro */
  --primary: 52 92% 50%;          /* Amarillo dorado (aceite) */
  --primary-foreground: 240 10% 10%;
  --secondary: 240 20% 94%;
  --muted: 240 20% 94%;
  --accent: 240 20% 94%;
  --card: 0 0% 100%;              /* Blanco */
  --border: 240 15% 84%;
  --ring: 45 100% 32%;            /* Dorado oscuro (focus ring) */
  --radius: 0.5rem;
  --destructive: 0 72% 34%;       /* Rojo */
  
  /* Sidebar */
  --sidebar-background: 240 20% 95%;
  --sidebar-primary: 52 92% 50%;
}
```

### 6.2 Tipografías

| Fuente | Uso probable |
|--------|-------------|
| **Inter Variable** | Cuerpo de texto, UI general |
| **Outfit Variable** | Títulos, headings |
| **DM Sans Variable** | Elementos secundarios |
| **JetBrains Mono Variable** | Código, datos tabulares |

### 6.3 Patrón shadcn/ui

La UI está construida sobre el sistema de **shadcn/ui**:
- Componentes basados en **Radix UI** primitives (accesibilidad incluida)
- Estilado con clases Tailwind + CSS variables
- `data-state` attributes para estados (open/closed)
- Función `cn()` (clsx + tailwind-merge) para composición de clases
- Componentes identificados: `Card`, `Input`, `Button`, `Dialog`, `Dropdown`, `Toast`

---

## 7. Módulos de Dominio (Chunks de negocio)

### 7.1 Entidades principales

| Chunk | Entidad | Descripción |
|-------|---------|-------------|
| `campaign-*.js` | Campaña | Gestión de campañas agrícolas (2022/23 → 2027/28) |
| `labor-*.js` | Trabajo | Jornales, partes, cuadrillas |
| `serviceOrders-*.js` | Encargos | Órdenes de servicio a terceros |
| `farmSurface-*.js` | Superficie | Cálculo de superficies de finca |
| `farmTools-*.js` | Herramientas finca | Utilidades de gestión de fincas |
| `farmName-*.js` | Nombre finca | Formateo y resolución de nombres |
| `farmCompleteness-*.js` | Completitud | % de datos completados por finca |
| `primaryFarm-*.js` | Finca principal | Selección de finca activa |
| `operationCatalogs-*.js` | Catálogos | Catálogos de operaciones (fitosanitarios, fertilizaciones, etc.) |
| `officialNotebook-*.js` | Cuaderno oficial | Cuaderno de campo regulado |
| `ropoDoctrine-*.js` | ROPO | Registro Oficial de Productores y Operadores |
| `legalSources-*.js` | Fuentes legales | Normativa y regulación aplicable |
| `planFeatures-*.js` | Features plan | Control de funcionalidades por plan de suscripción |
| `activeMillStore-*.js` | Almazara activa | Estado global de la almazara seleccionada |
| `equipmentSheet-*.js` | Fichas equipo | Gestión de maquinaria y equipos |
| `registrationDeadline-*.js` | Plazos registro | Fechas límite de declaraciones |
| `fertilizationPlanDuty-*.js` | Plan abonado | Obligatoriedad de plan de fertilización |
| `maturityIndexGuide-*.js` | Índice madurez | Guía de maduración de aceituna |
| `harvestSafety-*.js` | Seguridad cosecha | Indicadores de seguridad en recolección |
| `scanDraft-*.js` | Escaneo borrador | Digitalización de documentos/albaranes |
| `helpFaq-*.js` | FAQ | Preguntas frecuentes |
| `relations-*.js` | Relaciones | Gestión de relaciones entre entidades |

### 7.2 Utilidades especializadas

| Chunk | Función |
|-------|---------|
| `localDate-*.js` | Manejo de fechas locales (campañas septiembre-agosto) |
| `textFormat-*.js` | Formateo de textos, números, unidades |
| `searchText-*.js` | Búsqueda fuzzy en texto |
| `validateNIF-*.js` | Validación de NIF/CIF español |
| `errorUtils-*.js` | Gestión de errores |
| `apiError-*.js` | Parsing de errores de API |
| `logger-*.js` | Sistema de logging |
| `sameDayNotice-*.js` | Avisos del mismo día |
| `freshness-*.js` | Control de frescura de datos (cache invalidation) |
| `buildOperationPayload-*.js` | Constructor de payloads para operaciones |
| `definitions-*.js` | Definiciones/constantes del dominio |
| `indexCatalog-*.js` | Índice de catálogos maestros |

---

## 8. Servicios Externos

| Servicio | URL | Función |
|----------|-----|---------|
| **Sentry** | `o4511609697402880.ingest.de.sentry.io` | Error tracking (EU data residency) |
| **PostHog** | `eu.i.posthog.com` | Product analytics (EU) |
| **SIEX** | Via API propia (`/siex/*`) | Integración con Sistema de Información de Explotaciones |

---

## 9. Modelo de Datos (inferido de la API)

### 9.1 Entidades principales

```
Usuario (auth/me)
  └── Organización
       ├── Fincas (portfolio/farms)
       │    ├── Recintos SIGPAC
       │    ├── Superficie, Olivos, Variedad
       │    └── Parcelas / Zonas
       ├── Campañas (campaign)
       │    ├── Operaciones de campo (field-operations)
       │    │    ├── Fitosanitarios
       │    │    ├── Fertilizaciones
       │    │    ├── Riegos
       │    │    ├── Labores
       │    │    ├── Podas
       │    │    ├── Ecorégimen
       │    │    └── Recolección
       │    ├── Jornales (workers/workdays)
       │    ├── Cosechas (harvests)
       │    ├── Entregas (deliveries)
       │    ├── Gastos
       │    └── Plan de abonado (fertilization-plans)
       ├── Trabajadores (workers)
       ├── Equipamiento (equipment)
       ├── Almazaras (mills)
       ├── Asesores (advisors)
       ├── Stock insumos (input-warehouse)
       ├── Declaraciones PAC
       ├── SIEX
       ├── Contratos (agreements)
       └── Pasaporte olivar (passport)
```

### 9.2 Relaciones clave

- **Finca ↔ Campaña:** Una finca participa en múltiples campañas anuales (sept-agosto)
- **Campaña ↔ Operaciones:** Cada campaña tiene N operaciones de campo
- **Finca ↔ Parcela SIGPAC:** Vinculación catastral oficial
- **Usuario ↔ Roles:** Propietario, técnico, aplicador, encargado
- **Finca ↔ Almazara:** Relación de entrega (`mill_link`)
- **Campaña ↔ Plan abonado:** Un plan de fertilización por campaña
- **Cuaderno campo ↔ Operaciones:** Registro regulado de todas las actuaciones

---

## 10. Arquitectura de Despliegue

```
┌─────────────────────────────────────┐
│        agritech.olearia.io          │
│  ┌──────────┐  ┌─────────────────┐  │
│  │  CDN /   │  │  API Backend    │  │
│  │  Static  │  │  /api/v1/*      │  │
│  │  Assets  │  │  (Node/Python?) │  │
│  └──────────┘  └────────┬────────┘  │
│                         │           │
│                    ┌────┴────┐      │
│                    │   DB    │      │
│                    │ (UUID   │      │
│                    │ primary │      │
│                    │  keys)  │      │
│                    └─────────┘      │
└─────────────────────────────────────┘
         │                │
    ┌────┴────┐     ┌────┴────┐
    │ Sentry  │     │PostHog  │
    │ (EU DE) │     │ (EU)    │
    └─────────┘     └─────────┘
```

- **IDs:** UUIDs v4 (ej: `eec02ed2-0141-4600-a957-2ac1234a401a`)
- **Auth:** Sesión basada en cookies (endpoint `/auth/session`)
- **Geolocalización:** Coordenadas de finca (lat/lon para meteo y tratamientos)
- **Data residency:** Todo en servidores EU (Sentry DE, PostHog EU)

---

## 11. Funcionalidades Clave por Sección

### Dashboard
- Resumen de explotación (fincas, olivos, hectáreas)
- Widget meteorológico (temperatura, humedad, viento, lluvia)
- Advisory fitosanitario (Antracnosis, Mosca, Repilo → Apto/Justo/No tratar)
- Precios de aceite en tiempo real (AOVE, Virgen, Lampante con gráfico)
- Alertas de datos faltantes
- Lista de tareas pendientes
- Feed de actividad reciente
- Resumen financiero de campaña
- FAB "Apuntar" (registro rápido)

### Mis Fincas (Portfolio)
- Selector de campaña
- Tabs: Fincas | Cosecha | Dinero
- Sub-tabs: Mis fincas | PAC
- Tabla de datos con filtros y ordenación
- Estadísticas de cosecha por finca

### Cuaderno de Campo
- Cumplimiento legal (alertas graves/avisos)
- Tabs: Registro | Abonado | Almacén | En regla
- Filtros: Finca / Campaña / Estado
- Registro oficial de actuaciones

### El Año (Asistente fenológico)
- Escala BBCH (fases fenológicas del olivo)
- Timeline visual de fases
- Calendario de tratamientos (14 días)
- Tareas por fase
- Selector de finca

### Centro de Datos
- 30+ subsecciones CRUD
- Patrón común: Lista con filtros → Tabla → Formulario
- Importar / Exportar datos
- Tabs por vista de datos

---

## 12. Recomendaciones para Mágina Olivo v2

### 12.1 Stack recomendado (reproducción fiel)

```
React 18 + TypeScript
Vite (bundler)
Tailwind CSS v3/v4
shadcn/ui (componentes)
TanStack Query (data fetching)
Zustand (estado global)
Capacitor (app nativa)
Workbox (PWA)
Axios (HTTP client)
Lucide React (iconos)
```

### 12.2 Diferencias para Mágina Olivo

- **Paleta:** Sustituir amarillo dorado (`hsl(52, 92%, 50%)`) por verde olivo Sierra Mágina
- **Tipografías:** Mantener Inter (excelente legibilidad) + evaluar alternativa para headings
- **Backend:** Supabase (según AGENTS.md del repo) en lugar del backend propietario
- **Autenticación:** Supabase Auth en lugar de sesiones cookie
- **Offline-first:** Capacitor + SQLite local (según AGENTS.md)
- **Simplificaciones posibles:** SIEX, PAC, pasaporte olivar (evaluar necesidad)
- **Ampliaciones posibles:** IA para diagnóstico, cámara para escaneo, GPS tracking mejorado

### 12.3 Prioridad de desarrollo

1. **Core:** Auth + Dashboard + Fincas CRUD
2. **Datos:** Centro de Datos (operaciones, jornales, cosechas, gastos)
3. **Compliance:** Cuaderno de campo + planes de abonado
4. **Asistente:** Fenología + meteo + tratamientos
5. **Native:** Capacitor build + Haptics + offline sync
6. **Premium:** Precios aceite, estadísticas, IA

---

## 13. Archivos del Build (Assets)

### CSS
- `index-8mIJx-HN.css` — CSS compilado (Tailwind + componentes)

### Fuentes
- `inter-latin-wght-normal-Dx4kXJAl.woff2`
- `outfit-latin-wght-normal-Bc-8i84L.woff2`
- (DM Sans y JetBrains Mono cargadas dinámicamente)

### Imágenes
- `brand-leaf.svg` — Logo hoja (preloaded)
- `favicon.ico`
- `ios/192.png`, `ios/512.png`
- `apple-touch-icon.png`
- `android/android-launchericon-*.png` (48→512)
- `splash/apple-splash-*.png` (múltiples resoluciones)

### PWA
- `manifest.json`
- `sw.js` (Service Worker Workbox)

---

*Informe generado automáticamente mediante análisis de código fuente, red y DOM de agritech.olearia.io*  
*Para uso interno del proyecto Mágina Olivo v2*
