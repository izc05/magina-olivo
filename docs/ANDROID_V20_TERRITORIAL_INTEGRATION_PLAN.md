# Plan de Integración del Módulo Territorial en Android V20 (Mágina Olivo)

Fecha de consolidación: 2026-10-10  
Estado: Informe de Integración y Adaptación Arquitectónica  
Repositorio Destino: `izc05/magina-olivo-v20` (Android Nativo / Room / WorkManager)  
Issues Vinculados: #699, #700, #333, #720 (del repositorio `izc05/magina-olivo-v20`)  

---

## 1. Contexto y Objetivos

El repositorio `izc05/magina-olivo-v20` contiene la aplicación **Android nativa** (congelada en la baseline `RC1.2-BASELINE-2026-09-18`), especializada en la gestión offline-first del olivarero.

Este informe adapta la investigación, los contratos de datos y la migración SQL realizados previamente a la **arquitectura nativa de Android V20 (Kotlin, Room Database, Retrofit DTOs, WorkManager)**, garantizando que:
1. No se sobrescribe ni interfiere el desarrollo activo de Codex y Claude (Gate 21 / #696 / CR-011).
2. Se respeta el principio **"Sencillo por fuera, estructurado por dentro"**.
3. Se mantiene la separación total entre datos públicos territoriales y datos privados del agricultor (fincas, parcelas, entregas y cuadernos CUE V9).

---

## 2. Matriz de Diferencias de Arquitectura

| Dominio / Componente | Servidor / API TypeScript (`izc05/magina-olivo`) | App Nativa Android V20 (`izc05/magina-olivo-v20`) |
| :--- | :--- | :--- |
| **Persistencia Principal** | PostgreSQL 16 (Migraciones SQL `.sql`) | Room Database (SQLite en Kotlin `@Entity`, `@Dao`) |
| **Caché / Offline** | Fastify API / Cache headers | Room Tables + Outbox Queue + WorkManager Sync |
| **Modelos de Red** | TypeScript Interfaces / Fastify Schemas | Kotlin `@Serializable` Data Classes (DTOs) |
| **Manejo de Fechas** | Timestamptz ISO 8601 Strings | Kotlin `Instant` / `ZonedDateTime` (`Europe/Madrid`) |
| **Aislamiento** | Permisos RLS por `holding_id` en PostgreSQL | Base de datos SQLite cifrada/privada por usuario |

---

## 3. Estrategia de Adaptación por Módulo

### A. Catálogo Municipal y "Mi Pueblo" (Issue #700)
- **Servidor:** Endpoint `GET /api/v1/public/municipalities` consulta la tabla `public_municipalities`.
- **Android V20:**
  - Ingestión mediante `MunicipalityDto` al sincronizar la app.
  - Almacenamiento local en la tabla Room `cached_municipalities`.
  - Persistencia de `preferred_municipality_slug` en `AppPreferencesDataStore` (sin obligar a dar permisos GPS ni cambiar la finca activa).
  - Selección de cercanos calculada offline por la fórmula de Haversine sobre los centroides (`centerLatitude`, `centerLongitude`).

### B. Directorio de Cooperativas y Ficha Verificada (Issues #699, #333)
- **Servidor:** Endpoint `GET /api/v1/public/destinations` consulta la tabla `cooperatives`.
- **Android V20:**
  - En `Perfil > Cooperativa Habitual`, se ofrece el catálogo verificado (`cached_cooperatives`).
  - Si el agricultor ha introducido manualmente una organización local para sus pesadas, **no se sobrescribe**. Se vincula opcionalmente mediante `verified_platform_cooperative_id`.
  - Tarjeta en Inicio: Muestra nombre oficial, marca (*Magnasur*, *La Quinta Esencia*, *Pilar del Andaraje*, *Marquesado de Garcíez*) y teléfono de contacto.

### C. Comunidades de Regantes y Turnos de Riego (#720)
- **Servidor:** Endpoints `GET /api/v1/public/irrigation-communities` y `/:id/notices`.
- **Android V20 — Doble Modo:**
  1. **Modo Autogestión Personal (Offline):**
     - Almacenado en la tabla Room `personal_irrigation_plans`.
     - Permite al agricultor fijar fecha, hora, duración y parcela en su propia agenda.
     - Notificaciones locales programadas mediante `AlarmManager` / `WorkManager` (sin requerir conexión ni estar registrado en una comunidad).
  2. **Modo Información Comunitaria (Red):**
     - Avisos de turnos y cortes de agua cacheados en `cached_community_water_notices`.
     - El agricultor puede pulsar "Añadir a mi agenda" para crear un `PersonalIrrigationPlan` personal vinculado al aviso comunitario.
  3. **Protección del Cuaderno CUE V9 (#539):**
     - **Regla estricta:** Ni los avisos comunitarios ni los planes personales escriben automáticamente registros realizados en la tabla `activities`. La ejecución real de riego se registra **únicamente** cuando el agricultor confirma explícitamente el riego efectuado.

---

## 4. Definición de Contratos de Datos (Kotlin DTOs para Android V20)

```kotlin
package com.maginaolivo.network.dto

import kotlinx.serialization.Serializable

@Serializable
data class MunicipalityDto(
    val slug: String,
    val name: String,
    val province: String = "Jaén",
    val aemetCode: String,
    val ineCode: String? = null,
    val comarca: String = "Sierra Mágina",
    val officialUrl: String? = null,
    val electronicSeatUrl: String? = null,
    val centerLatitude: Double? = null,
    val centerLongitude: Double? = null
)

@Serializable
data class VerifiedCooperativeDto(
    val id: String,
    val officialName: String,
    val brandName: String? = null,
    val entityType: String, // "cooperative", "sat", "company"
    val municipalitySlug: String,
    val municipality: String,
    val province: String = "Jaén",
    val phone: String? = null,
    val email: String? = null,
    val websiteUrl: String? = null,
    val memberPortalUrl: String? = null,
    val verificationStatus: String // "verified", "candidate"
)

@Serializable
data class IrrigationCommunityDto(
    val id: String,
    val officialName: String,
    val shortName: String? = null,
    val entityType: String, // "community_of_irrigation", "sat_irrigation"
    val primaryMunicipalitySlug: String,
    val coveredMunicipalitySlugs: List<String> = emptyList(),
    val address: String? = null,
    val phone: String? = null,
    val websiteUrl: String? = null,
    val electronicSeatUrl: String? = null,
    val verificationStatus: String,
    val sourceBulletinRef: String? = null
)

@Serializable
data class CommunityWaterNoticeDto(
    val id: String,
    val communityId: String,
    val sectorId: String? = null,
    val noticeType: String, // "shift_schedule", "water_cut", "schedule_change", "general_notice"
    val title: String,
    val body: String,
    val startsAt: String, // ISO-8601 UTC
    val endsAt: String,
    val sourceType: String, // "community_verified", "public_bulletin"
    val sourceUrl: String? = null,
    val status: String // "published", "revoked", "expired"
)
```

---

## 5. Definición de Entidades Room para Android V20

```kotlin
package com.maginaolivo.database.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "cached_municipalities")
data class MunicipalityEntity(
    @PrimaryKey val slug: String,
    val name: String,
    val province: String,
    val ineCode: String?,
    val aemetCode: String,
    val officialUrl: String?,
    val electronicSeatUrl: String?,
    val centerLatitude: Double?,
    val centerLongitude: Double?,
    val lastCachedAtMs: Long = System.currentTimeMillis()
)

@Entity(tableName = "cached_irrigation_communities")
data class IrrigationCommunityEntity(
    @PrimaryKey val id: String,
    val officialName: String,
    val shortName: String?,
    val entityType: String,
    val primaryMunicipalitySlug: String,
    val verificationStatus: String,
    val sourceBulletinRef: String?,
    val lastCachedAtMs: Long = System.currentTimeMillis()
)

@Entity(tableName = "personal_irrigation_plans")
data class PersonalIrrigationPlanEntity(
    @PrimaryKey val id: String,
    val plotId: String,
    val sectorId: String?,
    val scheduledAtEpochMs: Long,
    val durationMinutes: Int,
    val linkedNoticeId: String?,
    val status: String, // "planned", "reprogrammed", "cancelled", "completed"
    val reminderMinutesBefore: Int = 30,
    val createdAtEpochMs: Long = System.currentTimeMillis()
)
```

---

## 6. Próximos Pasos de Integración en `izc05/magina-olivo-v20`

1. **Mantener PR #205 en `izc05/magina-olivo`:** Conservarla abierta como especificación del backend Fastify y base de datos PostgreSQL.
2. **Creación de Rama de Documentación en V20:** Crear la rama `docs/territorial-android-v20-spec` en `izc05/magina-olivo-v20` incorporando este informe de integración.
3. **Coordinación con Cierre Android (#696):** Esperar a que Codex culmine la entrega de Gate 21 físico antes de introducir modificaciones en las entidades de Room o en losViewModels de Inicio.
