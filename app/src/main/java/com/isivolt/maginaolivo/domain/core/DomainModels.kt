package com.isivolt.maginaolivo.domain.core

import java.time.Instant
import java.time.LocalDate

enum class CampaignStatus {
    PLANNED,
    ACTIVE,
    CLOSED,
}

enum class GeometrySource {
    CATASTRO,
    MANUAL,
    IMPORT,
    OTHER,
}

data class ParcelGeometry(
    val geoJson: String,
) {
    init {
        require(geoJson.isNotBlank()) { "GEOMETRY_REQUIRED" }
    }
}

data class Farm(
    val id: String,
    val ownerId: String,
    val name: String,
    val municipality: String? = null,
    val province: String? = null,
    val description: String? = null,
    val coverDocumentId: String? = null,
    val createdAt: Instant,
    val updatedAt: Instant,
    val deletedAt: Instant? = null,
    val version: Long = 0,
) {
    init {
        require(id.isNotBlank()) { "FARM_ID_REQUIRED" }
        require(ownerId.isNotBlank()) { "OWNER_ID_REQUIRED" }
        require(name.isNotBlank()) { "FARM_NAME_REQUIRED" }
        require(version >= 0) { "VERSION_INVALID" }
    }
}

data class Parcel(
    val id: String,
    val ownerId: String,
    val farmId: String,
    val alias: String,
    val cadastralReference: String? = null,
    val area: Area? = null,
    val oliveTreeCount: Int? = null,
    val mainVariety: String? = null,
    val geometry: ParcelGeometry? = null,
    val geometrySource: GeometrySource? = null,
    val createdAt: Instant,
    val updatedAt: Instant,
    val deletedAt: Instant? = null,
    val version: Long = 0,
) {
    init {
        require(id.isNotBlank()) { "PARCEL_ID_REQUIRED" }
        require(ownerId.isNotBlank()) { "OWNER_ID_REQUIRED" }
        require(farmId.isNotBlank()) { "FARM_ID_REQUIRED" }
        require(alias.isNotBlank()) { "PARCEL_ALIAS_REQUIRED" }
        require(oliveTreeCount == null || oliveTreeCount >= 0) { "OLIVE_TREE_COUNT_INVALID" }
        require(version >= 0) { "VERSION_INVALID" }
    }
}

data class Campaign(
    val id: String,
    val ownerId: String,
    val farmId: String,
    val name: String,
    val startDate: LocalDate? = null,
    val endDate: LocalDate? = null,
    val status: CampaignStatus = CampaignStatus.PLANNED,
    val createdAt: Instant,
    val updatedAt: Instant,
    val deletedAt: Instant? = null,
    val version: Long = 0,
) {
    init {
        require(id.isNotBlank()) { "CAMPAIGN_ID_REQUIRED" }
        require(ownerId.isNotBlank()) { "OWNER_ID_REQUIRED" }
        require(farmId.isNotBlank()) { "FARM_ID_REQUIRED" }
        require(name.isNotBlank()) { "CAMPAIGN_NAME_REQUIRED" }
        require(endDate == null || startDate == null || !endDate.isBefore(startDate)) { "CAMPAIGN_DATE_RANGE_INVALID" }
        require(version >= 0) { "VERSION_INVALID" }
    }
}

data class CampaignParcel(
    val id: String,
    val ownerId: String,
    val campaignId: String,
    val parcelId: String,
    val createdAt: Instant,
    val updatedAt: Instant,
    val deletedAt: Instant? = null,
    val version: Long = 0,
) {
    init {
        require(id.isNotBlank()) { "CAMPAIGN_PARCEL_ID_REQUIRED" }
        require(ownerId.isNotBlank()) { "OWNER_ID_REQUIRED" }
        require(campaignId.isNotBlank()) { "CAMPAIGN_ID_REQUIRED" }
        require(parcelId.isNotBlank()) { "PARCEL_ID_REQUIRED" }
        require(version >= 0) { "VERSION_INVALID" }
    }
}
