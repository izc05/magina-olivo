package com.isivoltpro.maginaolivo.data.local

import com.isivoltpro.maginaolivo.data.local.entity.IrrigationCommunityEntity
import com.isivoltpro.maginaolivo.data.local.entity.TerritorialMunicipalityEntity
import com.isivoltpro.maginaolivo.domain.territorial.TerritorialCooperativeInfo
import com.isivoltpro.maginaolivo.domain.territorial.TerritorialIrrigationCommunityInfo
import com.isivoltpro.maginaolivo.domain.territorial.TerritorialLocality
import com.isivoltpro.maginaolivo.domain.territorial.TerritorialMunicipality

/**
 * Catálogo territorial verificado con fuentes oficiales para la comarca de Sierra Mágina.
 * Piloto inicial: Bedmar, Garcíez y Jódar.
 *
 * Fuentes oficiales:
 * - Instituto Nacional de Estadística (INE)
 * - Agencia Estatal de Meteorología (AEMET)
 * - Boletín Oficial del Estado (BOE)
 * - Boletín Oficial de la Provincia de Jaén (BOP)
 * - Boletín Oficial de la Junta de Andalucía (BOJA)
 * - Registro de Sociedades Cooperativas Andaluzas
 * - Consejo Regulador D.O.P. Sierra Mágina
 */
object TerritorialCatalogData {
    // Source review date, not the time this offline seed happens to be inserted.
    private const val SOURCE_CHECKED_AT_MS = 1791763200000L // 2026-10-12 UTC

    val MUNICIPALITIES: List<TerritorialMunicipality> = listOf(
        TerritorialMunicipality(
            slug = "bedmar-y-garciez",
            name = "Bedmar y Garcíez",
            province = "Jaén",
            ineCode = "23902",
            aemetCode = "23902",
            comarca = "Sierra Mágina",
            officialUrl = "https://www.bedmargarciez.es/",
            electronicSeatUrl = "https://bedmargarciez.sedelectronica.es/",
            centerLatitude = 37.82311842,
            centerLongitude = -3.40977505,
            sourceUrl = "https://www.aemet.es/es/eltiempo/prediccion/municipios/bedmar-y-garciez-id23902",
            localities = listOf(
                TerritorialLocality(
                    slug = "bedmar",
                    name = "Bedmar",
                    municipalitySlug = "bedmar-y-garciez",
                    isPedaniaOrLocalEntity = false,
                    postalCode = "23537",
                ),
                TerritorialLocality(
                    slug = "garciez",
                    name = "Garcíez",
                    municipalitySlug = "bedmar-y-garciez",
                    isPedaniaOrLocalEntity = true,
                    postalCode = "23539",
                ),
            ),
        ),
        TerritorialMunicipality(
            slug = "jodar",
            name = "Jódar",
            province = "Jaén",
            ineCode = "23053",
            aemetCode = "23053",
            comarca = "Sierra Mágina",
            officialUrl = "https://www.jodar.es/",
            electronicSeatUrl = "https://jodar.sedelectronica.es/",
            centerLatitude = 37.84139859,
            centerLongitude = -3.35042356,
            sourceUrl = "https://www.aemet.es/es/eltiempo/prediccion/municipios/jodar-id23053",
            localities = listOf(
                TerritorialLocality(
                    slug = "jodar",
                    name = "Jódar",
                    municipalitySlug = "jodar",
                    isPedaniaOrLocalEntity = false,
                    postalCode = "23500",
                ),
            ),
        ),
    )

    val COOPERATIVES: List<TerritorialCooperativeInfo> = listOf(
        TerritorialCooperativeInfo(
            id = "10000000-0000-4000-8000-000000000001",
            officialName = "S.C.A. Bedmarense",
            brandName = "Magnasur",
            municipalitySlug = "bedmar-y-garciez",
            localitySlug = "bedmar",
            entityType = "cooperative_sca",
            dopSierraMagina = true,
            mainBrands = listOf("Magnasur", "Oro de Magnasur"),
            services = listOf(
                "molturacion",
                "bodega",
                "envasado",
                "tienda_aove",
            ),
            address = "Polígono Industrial Los Llanos, s/n, 23537 Bedmar, Jaén",
            phone = "+34953760524",
            email = "magnasur@magnasur.com",
            websiteUrl = "https://magnasur.com/",
            verificationStatus = "verified",
            sourceUrl = "https://sierramagina.org/project/s-c-a-bedmarense/",
        ),
        TerritorialCooperativeInfo(
            id = "10000000-0000-4000-8000-000000000002",
            officialName = "S.A.T. Ntra. Sra. del Camino",
            brandName = "Marquesado de Garcíez",
            municipalitySlug = "bedmar-y-garciez",
            localitySlug = "garciez",
            entityType = "sat",
            dopSierraMagina = true,
            mainBrands = listOf("Marquesado de Garcíez"),
            services = listOf(
                "molturacion",
                "venta_aove",
            ),
            address = "Plaza Juan Carlos I, 1, 23539 Garcíez, Jaén",
            phone = "+34953359098",
            email = "garciez@tuaceitedejaen.com",
            websiteUrl = null,
            verificationStatus = "verified",
            sourceUrl = "https://sierramagina.org/project/s-a-t-ntra-sra-del-camino/",
        ),
        TerritorialCooperativeInfo(
            id = "10000000-0000-4000-8000-000000000003",
            officialName = "S.C.A. Nuestra Señora del Pilar del Andaraje",
            brandName = "El Pilar del Andaraje",
            municipalitySlug = "jodar",
            localitySlug = "jodar",
            entityType = "cooperative_sca",
            dopSierraMagina = true,
            mainBrands = listOf("El Pilar del Andaraje"),
            services = listOf(
                "molturacion",
            ),
            address = "Calle Juan Martín, 144, 23500 Jódar, Jaén",
            phone = "+34953787624",
            email = null,
            websiteUrl = "https://pilardeandaraje.es/",
            verificationStatus = "verified",
            sourceUrl = "https://sierramagina.org/project/s-c-a-ntra-sra-pilar-del-andaraje/",
        ),
        TerritorialCooperativeInfo(
            id = "10000000-0000-4000-8000-000000000004",
            officialName = "S.C.A. Santísimo Cristo de la Misericordia",
            brandName = "La Quinta Esencia",
            municipalitySlug = "jodar",
            localitySlug = "jodar",
            entityType = "cooperative_sca",
            dopSierraMagina = true,
            mainBrands = listOf("La Quinta Esencia"),
            services = listOf(
                "molturacion",
                "envasado_premium",
                "tienda_aove",
            ),
            address = "Camino del Canónigo, s/n, 23500 Jódar, Jaén",
            phone = "+34953785031",
            email = "info@laquintaesencia.com",
            websiteUrl = "https://laquintaesencia.com/",
            verificationStatus = "verified",
            sourceUrl = "https://sierramagina.org/project/s-c-a-santisimo-cristo-de-la-misericordia/",
        ),
    )

    val IRRIGATION_COMMUNITIES: List<TerritorialIrrigationCommunityInfo> = listOf(
        TerritorialIrrigationCommunityInfo(
            id = "20000000-0000-4000-8000-000000000001",
            officialName = "Comunidad de Regantes Canal del Jandulilla",
            shortName = "Canal del Jandulilla",
            primaryMunicipalitySlug = "jodar",
            entityType = "community_of_irrigation",
            bulletinReference = "BOE-B-2025-14108",
            address = "Jódar, Jaén",
            phone = null,
            email = null,
            websiteUrl = null,
            verificationStatus = "verified",
            notes = "Regadío olivar cuenca del río Jandulilla. Convocatorias oficiales verificadas en BOE.",
        ),
        TerritorialIrrigationCommunityInfo(
            id = "20000000-0000-4000-8000-000000000002",
            officialName = "Comunidad de Regantes Lagunillas y Cerrón",
            shortName = "Lagunillas y Cerrón",
            primaryMunicipalitySlug = "bedmar-y-garciez",
            entityType = "community_of_irrigation",
            bulletinReference = "BOE-B-2026-19273",
            address = "Bedmar, Jaén",
            phone = null,
            email = null,
            websiteUrl = null,
            verificationStatus = "verified",
            notes = "Ordenanzas expuestas en el Ayuntamiento de Bedmar y Garcíez, BOE-B-2026-19273. No publica turnos de riego.",
        ),
        TerritorialIrrigationCommunityInfo(
            id = "20000000-0000-4000-8000-000000000003",
            officialName = "Comunidad de Regantes SAT Fique",
            shortName = "SAT Fique (Riego)",
            primaryMunicipalitySlug = "bedmar-y-garciez",
            entityType = "community_of_irrigation",
            bulletinReference = "BOE-B-2025-43655",
            address = "Bedmar, Jaén",
            phone = null,
            email = null,
            websiteUrl = null,
            verificationStatus = "verified",
            notes = "Comunidad de Regantes SAT Fique, convocatoria en Bedmar: BOE-B-2025-43655. No confundir con la SAT Ntra. Sra. del Camino de Garcíez.",
        ),
        TerritorialIrrigationCommunityInfo(
            id = "20000000-0000-4000-8000-000000000004",
            officialName = "Comunidad de Regantes Caz de los Molinos",
            shortName = "Caz de los Molinos",
            primaryMunicipalitySlug = "jodar",
            entityType = "community_of_irrigation",
            bulletinReference = "BOP-JAEN-2025-03-14",
            address = "Jódar, Jaén",
            phone = null,
            email = null,
            websiteUrl = null,
            verificationStatus = "verified",
            notes = "Convocatoria de asamblea en Jódar: BOP-2025-761, 14/03/2025. No publica turnos de riego.",
        ),
    )

    fun toMunicipalityEntities(): List<TerritorialMunicipalityEntity> =
        MUNICIPALITIES.map { m ->
            TerritorialMunicipalityEntity(
                slug = m.slug,
                name = m.name,
                province = m.province,
                ineCode = m.ineCode,
                aemetCode = m.aemetCode,
                comarca = m.comarca,
                officialUrl = m.officialUrl,
                electronicSeatUrl = m.electronicSeatUrl,
                centerLatitude = m.centerLatitude,
                centerLongitude = m.centerLongitude,
                sourceUrl = m.sourceUrl,
                lastCheckedAtMs = SOURCE_CHECKED_AT_MS,
                active = true,
            )
        }

    fun toCommunityEntities(): List<IrrigationCommunityEntity> =
        IRRIGATION_COMMUNITIES.map { c ->
            IrrigationCommunityEntity(
                id = c.id,
                officialName = c.officialName,
                shortName = c.shortName,
                entityType = c.entityType,
                primaryMunicipalitySlug = c.primaryMunicipalitySlug,
                address = c.address,
                phone = c.phone,
                email = c.email,
                websiteUrl = c.websiteUrl,
                electronicSeatUrl = c.electronicSeatUrl,
                verificationStatus = c.verificationStatus,
                sourceBulletinRef = c.bulletinReference,
                lastCheckedAtMs = SOURCE_CHECKED_AT_MS,
                active = true,
            )
        }
}
