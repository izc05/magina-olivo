package com.isivolt.maginaolivo.domain.core

import java.time.Instant
import java.time.LocalDate
import java.util.UUID

sealed interface DomainError {
    data object InvalidOwner : DomainError
    data object InvalidFarmName : DomainError
    data object InvalidCampaignName : DomainError
    data object InvalidParcelAlias : DomainError
    data object InvalidDateRange : DomainError
    data object InvalidOliveTreeCount : DomainError
    data object FarmNotFound : DomainError
    data object ParcelNotFound : DomainError
    data object CampaignNotFound : DomainError
    data object OwnerMismatch : DomainError
    data object ParcelBelongsToDifferentFarm : DomainError
    data object CampaignClosed : DomainError
}

sealed interface DomainResult<out T> {
    data class Success<T>(val value: T) : DomainResult<T>
    data class Failure(val error: DomainError) : DomainResult<Nothing>
}

class CreateFarm(
    private val farms: FarmRepository,
    private val idFactory: () -> String = { UUID.randomUUID().toString() },
    private val now: () -> Instant = Instant::now,
) {
    suspend operator fun invoke(
        ownerId: String,
        name: String,
        municipality: String? = null,
        province: String? = null,
        description: String? = null,
        coverDocumentId: String? = null,
    ): DomainResult<Farm> {
        if (ownerId.isBlank()) return DomainResult.Failure(DomainError.InvalidOwner)
        val normalizedName = name.trim()
        if (normalizedName.isEmpty()) return DomainResult.Failure(DomainError.InvalidFarmName)
        val timestamp = now()
        val farm = Farm(
            id = idFactory(),
            ownerId = ownerId,
            name = normalizedName,
            municipality = municipality?.trim()?.takeIf(String::isNotEmpty),
            province = province?.trim()?.takeIf(String::isNotEmpty),
            description = description?.trim()?.takeIf(String::isNotEmpty),
            coverDocumentId = coverDocumentId,
            createdAt = timestamp,
            updatedAt = timestamp,
        )
        farms.upsert(farm)
        return DomainResult.Success(farm)
    }
}

class CreateParcel(
    private val farms: FarmRepository,
    private val parcels: ParcelRepository,
    private val idFactory: () -> String = { UUID.randomUUID().toString() },
    private val now: () -> Instant = Instant::now,
) {
    suspend operator fun invoke(
        ownerId: String,
        farmId: String,
        alias: String,
        cadastralReference: String? = null,
        area: Area? = null,
        oliveTreeCount: Int? = null,
        mainVariety: String? = null,
        geometry: ParcelGeometry? = null,
        geometrySource: GeometrySource? = null,
    ): DomainResult<Parcel> {
        if (ownerId.isBlank()) return DomainResult.Failure(DomainError.InvalidOwner)
        val normalizedAlias = alias.trim()
        if (normalizedAlias.isEmpty()) return DomainResult.Failure(DomainError.InvalidParcelAlias)
        if (oliveTreeCount != null && oliveTreeCount < 0) {
            return DomainResult.Failure(DomainError.InvalidOliveTreeCount)
        }
        val farm = farms.getById(farmId) ?: return DomainResult.Failure(DomainError.FarmNotFound)
        if (farm.ownerId != ownerId) return DomainResult.Failure(DomainError.OwnerMismatch)
        val timestamp = now()
        val parcel = Parcel(
            id = idFactory(),
            ownerId = ownerId,
            farmId = farmId,
            alias = normalizedAlias,
            cadastralReference = cadastralReference?.trim()?.takeIf(String::isNotEmpty),
            area = area,
            oliveTreeCount = oliveTreeCount,
            mainVariety = mainVariety?.trim()?.takeIf(String::isNotEmpty),
            geometry = geometry,
            geometrySource = geometrySource,
            createdAt = timestamp,
            updatedAt = timestamp,
        )
        parcels.upsert(parcel)
        return DomainResult.Success(parcel)
    }
}

class CreateCampaign(
    private val farms: FarmRepository,
    private val campaigns: CampaignRepository,
    private val idFactory: () -> String = { UUID.randomUUID().toString() },
    private val now: () -> Instant = Instant::now,
) {
    suspend operator fun invoke(
        ownerId: String,
        farmId: String,
        name: String,
        startDate: LocalDate? = null,
        endDate: LocalDate? = null,
        status: CampaignStatus = CampaignStatus.PLANNED,
    ): DomainResult<Campaign> {
        if (ownerId.isBlank()) return DomainResult.Failure(DomainError.InvalidOwner)
        val normalizedName = name.trim()
        if (normalizedName.isEmpty()) return DomainResult.Failure(DomainError.InvalidCampaignName)
        if (startDate != null && endDate != null && endDate.isBefore(startDate)) {
            return DomainResult.Failure(DomainError.InvalidDateRange)
        }
        val farm = farms.getById(farmId) ?: return DomainResult.Failure(DomainError.FarmNotFound)
        if (farm.ownerId != ownerId) return DomainResult.Failure(DomainError.OwnerMismatch)
        val timestamp = now()
        val campaign = Campaign(
            id = idFactory(),
            ownerId = ownerId,
            farmId = farmId,
            name = normalizedName,
            startDate = startDate,
            endDate = endDate,
            status = status,
            createdAt = timestamp,
            updatedAt = timestamp,
        )
        campaigns.upsert(campaign)
        return DomainResult.Success(campaign)
    }
}

class AddParcelToCampaign(
    private val parcels: ParcelRepository,
    private val campaigns: CampaignRepository,
    private val links: CampaignParcelRepository,
    private val idFactory: () -> String = { UUID.randomUUID().toString() },
    private val now: () -> Instant = Instant::now,
) {
    suspend operator fun invoke(
        ownerId: String,
        campaignId: String,
        parcelId: String,
    ): DomainResult<CampaignParcel> {
        val campaign = campaigns.getById(campaignId)
            ?: return DomainResult.Failure(DomainError.CampaignNotFound)
        val parcel = parcels.getById(parcelId)
            ?: return DomainResult.Failure(DomainError.ParcelNotFound)
        if (campaign.ownerId != ownerId || parcel.ownerId != ownerId) {
            return DomainResult.Failure(DomainError.OwnerMismatch)
        }
        if (campaign.status == CampaignStatus.CLOSED) {
            return DomainResult.Failure(DomainError.CampaignClosed)
        }
        if (campaign.farmId != parcel.farmId) {
            return DomainResult.Failure(DomainError.ParcelBelongsToDifferentFarm)
        }
        links.get(campaignId, parcelId)?.let { return DomainResult.Success(it) }
        val timestamp = now()
        val link = CampaignParcel(
            id = idFactory(),
            ownerId = ownerId,
            campaignId = campaignId,
            parcelId = parcelId,
            createdAt = timestamp,
            updatedAt = timestamp,
        )
        links.upsert(link)
        return DomainResult.Success(link)
    }
}

class RemoveParcelFromCampaign(
    private val links: CampaignParcelRepository,
    private val now: () -> Instant = Instant::now,
) {
    suspend operator fun invoke(campaignId: String, parcelId: String): DomainResult<Unit> {
        val link = links.get(campaignId, parcelId) ?: return DomainResult.Success(Unit)
        links.softDelete(link.id, now())
        return DomainResult.Success(Unit)
    }
}

class CloseCampaign(
    private val campaigns: CampaignRepository,
    private val now: () -> Instant = Instant::now,
) {
    suspend operator fun invoke(campaignId: String, endDate: LocalDate? = null): DomainResult<Campaign> {
        val campaign = campaigns.getById(campaignId)
            ?: return DomainResult.Failure(DomainError.CampaignNotFound)
        if (campaign.startDate != null && endDate != null && endDate.isBefore(campaign.startDate)) {
            return DomainResult.Failure(DomainError.InvalidDateRange)
        }
        val closed = campaign.copy(
            endDate = endDate ?: campaign.endDate,
            status = CampaignStatus.CLOSED,
            updatedAt = now(),
        )
        campaigns.upsert(closed)
        return DomainResult.Success(closed)
    }
}
