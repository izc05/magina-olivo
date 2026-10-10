# Especificación Técnica del Módulo Territorial V1

Fecha de consolidación: 2026-10-10  
Estado: Especificación y Diseño Arquitectónico (Bloques P1 / R0–R3)  
Issues de referencia: #699, #700, #333, #720, #532  

---

## 1. Visión y Principios del Catálogo Territorial

El módulo territorial de Mágina Olivo reúne la información de municipios, cooperativas/almazaras, comunidades de regantes, turnos de riego, noticias locales y servicios de la comarca.

### Principios obligatorios:
1. **Reutilizar modelos existentes sin duplicidad:** Se extienden las tablas `public_municipalities`, `cooperatives`, `public_data_sources` y `public_news_items` en lugar de crear modelos duplicados o silos aislados.
2. **Aislamiento estricto:** Separación total entre **datos públicos verificados de la plataforma** y **datos privados de fincas/parcelas del agricultor**.
3. **Doble modo de riego (#720):**
   - *Autogestión personal offline:* El agricultor planifica y recibe recordatorios sin necesidad de conexión ni participación de la comunidad.
   - *Información comunitaria:* Avisos oficial/públicos emitidos por comunidades o boletines. Un aviso comunitario **NUNCA** escribe de forma automática una actividad realizada en el Cuaderno (CUE V9 #539).
4. **Sin datos simulados ni scraping no autorizado:** Datos provienen de fuentes oficiales (BOE, BOP, INE, AEMET, portales con licencia) y revisiones auditadas.

---

## 2. Esquema de Base de Datos Canónico (SQL Migration)

A continuación se detalla la definición de migración para extender y añadir las tablas territoriales.

```sql
-- =============================================================================
-- MÁGINA OLIVO — MÓDULO TERRITORIAL (Migración 0050_territorial_foundation.sql)
-- =============================================================================

-- 1. Ampliación de municipios públicos (public_municipalities)
alter table public_municipalities
  add column if not exists ine_code char(5) check (ine_code ~ '^[0-9]{5}$'),
  add column if not exists comarca text default 'Sierra Mágina',
  add column if not exists official_url text,
  add column if not exists electronic_seat_url text,
  add column if not exists center_latitude double precision,
  add column if not exists center_longitude double precision;

comment on column public_municipalities.ine_code is 'Código oficial de municipio del INE (5 dígitos).';
comment on column public_municipalities.electronic_seat_url is 'Dirección oficial de la sede electrónica municipal para trámites y edictos.';

-- 2. Ampliación de noticias públicas con filtro municipal
alter table public_news_items
  add column if not exists municipality_slug text references public_municipalities(slug) on delete set null;

create index if not exists public_news_items_municipality_idx
  on public_news_items(municipality_slug, published_at desc)
  where active = true;

-- 3. Comunidades de Regantes y entidades de riego (irrigation_communities)
create table if not exists irrigation_communities (
  id uuid primary key default gen_random_uuid(),
  official_name text not null check (length(trim(official_name)) > 0),
  short_name text,
  entity_type text not null default 'community_of_irrigation'
    check (entity_type in ('community_of_irrigation', 'sat_irrigation', 'acequia_association', 'other')),
  primary_municipality_slug text not null references public_municipalities(slug),
  covered_municipality_slugs jsonb not null default '[]'::jsonb,
  address text,
  phone text,
  email text,
  website_url text,
  electronic_seat_url text,
  verification_status text not null default 'candidate'
    check (verification_status in ('candidate', 'verified', 'collaborating')),
  source_bulletin_ref text,
  last_checked_at timestamptz not null default now(),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table irrigation_communities is
  'Directorio público verificado de Comunidades de Regantes y SATs de riego.';

-- 4. Sectores de Riego dentro de la comunidad (irrigation_sectors)
create table if not exists irrigation_sectors (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references irrigation_communities(id) on delete cascade,
  sector_code text not null check (length(trim(sector_code)) > 0),
  name text not null check (length(trim(name)) > 0),
  description text,
  verification_status text not null default 'candidate'
    check (verification_status in ('candidate', 'verified')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (community_id, sector_code)
);

-- 5. Avisos y Turnos Comunitarios de Riego (community_water_notices)
create table if not exists community_water_notices (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references irrigation_communities(id) on delete cascade,
  sector_id uuid references irrigation_sectors(id) on delete set null,
  notice_type text not null default 'shift_schedule'
    check (notice_type in ('shift_schedule', 'water_cut', 'schedule_change', 'general_notice')),
  title text not null check (length(trim(title)) > 0),
  body text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  source_type text not null default 'public_bulletin'
    check (source_type in ('community_verified', 'public_bulletin', 'manual_unverified')),
  source_url text,
  status text not null default 'published'
    check (status in ('draft', 'published', 'revoked', 'expired')),
  published_at timestamptz not null default now(),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at >= starts_at)
);

create index if not exists community_water_notices_active_idx
  on community_water_notices(community_id, starts_at desc)
  where status = 'published';

-- 6. Enlace entre Parcela Privada y Comunidad/Sector (plot_irrigation_links)
create table if not exists plot_irrigation_links (
  id uuid primary key default gen_random_uuid(),
  plot_id uuid not null references plots(id) on delete cascade,
  community_id uuid references irrigation_communities(id) on delete set null,
  sector_id uuid references irrigation_sectors(id) on delete set null,
  water_supply_type text not null default 'drip_pressurized'
    check (water_supply_type in ('gravity_acequia', 'drip_pressurized', 'well_private', 'dryland', 'other')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (plot_id, community_id, sector_id)
);
```

---

## 3. Contratos de Datos (TypeScript Domain Model)

```typescript
// packages/domain/src/territorial.ts

export type EntityVerificationStatus = 'candidate' | 'verified' | 'collaborating';

export interface PublicMunicipality {
  slug: string;
  name: string;
  province: string;
  aemetCode: string;
  ineCode?: string;
  comarca: string;
  aliases: string[];
  officialUrl?: string;
  electronicSeatUrl?: string;
  centerLatitude?: number;
  centerLongitude?: number;
  sourceUrl: string;
  checkedAt: string;
  active: boolean;
}

export interface VerifiedCooperative {
  id: string;
  officialName: string;
  brandName?: string;
  entityType: 'cooperative' | 'sat' | 'company' | 'other';
  municipalitySlug: string;
  municipality: string;
  province: string;
  address?: string;
  phone?: string;
  email?: string;
  websiteUrl?: string;
  memberPortalUrl?: string;
  sourceUrl: string;
  verificationStatus: EntityVerificationStatus;
}

export interface IrrigationCommunity {
  id: string;
  officialName: string;
  shortName?: string;
  entityType: 'community_of_irrigation' | 'sat_irrigation' | 'acequia_association' | 'other';
  primaryMunicipalitySlug: string;
  coveredMunicipalitySlugs: string[];
  address?: string;
  phone?: string;
  email?: string;
  websiteUrl?: string;
  electronicSeatUrl?: string;
  verificationStatus: EntityVerificationStatus;
  sourceBulletinRef?: string;
  lastCheckedAt: string;
  active: boolean;
}

export interface IrrigationSector {
  id: string;
  communityId: string;
  sectorCode: string;
  name: string;
  description?: string;
  verificationStatus: 'candidate' | 'verified';
  active: boolean;
}

export interface CommunityWaterNotice {
  id: string;
  communityId: string;
  sectorId?: string;
  noticeType: 'shift_schedule' | 'water_cut' | 'schedule_change' | 'general_notice';
  title: string;
  body: string;
  startsAt: string; // ISO 8601 UTC / Europe/Madrid TZ
  endsAt: string;
  sourceType: 'community_verified' | 'public_bulletin' | 'manual_unverified';
  sourceUrl?: string;
  status: 'draft' | 'published' | 'revoked' | 'expired';
  publishedAt: string;
  expiresAt?: string;
}

export interface PersonalIrrigationPlan {
  id: string;
  plotId: string;
  sectorId?: string;
  scheduledAt: string;
  durationMinutes: number;
  linkedNoticeId?: string;
  status: 'planned' | 'reprogrammed' | 'cancelled' | 'completed';
  reminderMinutesBefore: number;
}
```

---

## 4. Propuesta de Implementación por Bloques

### Bloque A: Fundación y Catálogo Provincial de Municipios (P1 #700)
- **Fase A1:** Ingestión de semillas verificadas de municipios de Jaén (Bedmar y Garcíez `23902`, Jódar `23053`, Jimena, Albanchez, etc.).
- **Fase A2:** Selector de localidad preferida en cliente Android/web sin requerir permisos GPS.
- **Fase A3:** Pruebas unitarias de resolución de municipio cercano por centroide y fallback a AEMET/sitio oficial.

### Bloque B: Directorio de Cooperativas y Ficha Verificada (P1 #333 / #532)
- **Fase B1:** Fichas verificadas de S.C.A. Bedmarense, S.A.T. Ntra. Sra. del Camino, S.C.A. Pilar del Andaraje y S.C.A. Santísimo Cristo de la Misericordia.
- **Fase B2:** Vinculación no destructiva entre la Organization introducida localmente por el agricultor para sus pesadas y la ficha oficial verificada.
- **Fase B3:** Bloque "Mi cooperativa" en Inicio con teléfono de contacto y avisos públicos de recepción.

### Bloque C: Comunidades de Regantes y Turnos (P1 #720)
- **Fase C1:** Ingestión del catálogo inicial de C.R. Canal del Jandulilla, C.R. Lagunillas y Cerrón, C.R. Caz de los Molinos y S.A.T. Fique.
- **Fase C2:** Autogestión de turnos de riego en la agenda local del agricultor (Room DB) con recordatorios offline.
- **Fase C3:** Suscripción local a avisos comunitarios de riego con distinción clara entre "Aviso Comunitario" y "Riego Realizado (Cuaderno CUE V9)".

### Bloque D: Noticias y Servicios Locales (P1 #699 / #532)
- **Fase D1:** Ingestor de edictos/noticias oficiales por municipio en `public_news_items`.
- **Fase D2:** Integración de directorio local no patrocinado (OSM / Geoapify Places) cacheados por municipio.

---

## 5. Plan de Pruebas y Criterios de Aceptación

1. **Pruebas de Aislamiento:**
   - La selección de un municipio o cooperativa por parte del agricultor no altera los datos de sus parcelas ni transmite información privada al backend.
2. **Pruebas de Turnos e Idempotencia:**
   - Creación de un plan de riego offline sin internet.
   - Recepción de una cancelación de aviso comunitario que conserva el historial y notifica de la rectificación sin borrar el registro personal del usuario.
3. **Pruebas CUE V9:**
   - Comprobar que la ejecución real de riego registra únicamente en `activities` la aplicación con volumen/duración sin falsificar compatibilidad oficial.
