package com.isivolt.maginaolivo.data.repository

import com.isivolt.maginaolivo.data.local.CampaignDao
import com.isivolt.maginaolivo.data.local.CampaignEntity
import com.isivolt.maginaolivo.data.local.CampaignParcelDao
import com.isivolt.maginaolivo.data.local.CampaignParcelEntity
import com.isivolt.maginaolivo.data.local.FarmDao
import com.isivolt.maginaolivo.data.local.FarmEntity
import com.isivolt.maginaolivo.data.local.FieldWriteDao
import com.isivolt.maginaolivo.data.local.PlotDao
import com.isivolt.maginaolivo.data.local.PlotEntity
import com.isivolt.maginaolivo.data.local.SyncOutboxEntity
import com.isivolt.maginaolivo.domain.core.Area
import com.isivolt.maginaolivo.domain.core.Campaign
import com.isivolt.maginaolivo.domain.core.CampaignParcel
import com.isivolt.maginaolivo.domain.core.CampaignParcelRepository
import com.isivolt.maginaolivo.domain.core.CampaignRepository
import com.isivolt.maginaolivo.domain.core.CampaignStatus
import com.isivolt.maginaolivo.domain.core.Farm
import com.isivolt.maginaolivo.domain.core.FarmRepository
import com.isivolt.maginaolivo.domain.core.GeometrySource
import com.isivolt.maginaolivo.domain.core.Parcel
import com.isivolt.maginaolivo.domain.core.ParcelGeometry
import com.isivolt.maginaolivo.domain.core.ParcelRepository
import java.math.BigDecimal
import java.time.Instant
import java.time.LocalDate
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private const val PENDING_UPLOAD = "pending_upload"
private const val PENDING_DELETE = "pending_delete"

fun FarmEntity.toDomain(): Farm =
    Farm(
        id = id,
        ownerId = ownerId,
        name = name,
        municipality = municipality,
        province = province,
        description = description,
        coverDocumentId = coverDocumentId,
        createdAt = Instant.ofEpochMilli(createdAtEpochMs),
        updatedAt = Instant.ofEpochMilli(updatedAtEpochMs),
        deletedAt = deletedAtEpochMs?.let(Instant::ofEpochMilli),
        version = remoteVersion,
    )

fun PlotEntity.toDomain(): Parcel =
    Parcel(
        id = id,
        ownerId = ownerId,
        farmId = farmId,
        alias = name,
        cadastralReference = cadastralReference,
        area = areaSquareMetersDecimal
            ?.let { Area.ofSquareMeters(it) }
            ?: areaHa?.let { Area.ofHectares(BigDecimal.valueOf(it)) },
        oliveTreeCount = oliveTreeCount,
        mainVariety = mainVariety,
        geometry = boundaryGeoJson?.let(::ParcelGeometry),
        geometrySource = boundarySource?.toGeometrySource(),
        createdAt = Instant.ofEpochMilli(createdAtEpochMs),
        updatedAt = Instant.ofEpochMilli(updatedAtEpochMs),
        deletedAt = deletedAtEpochMs?.let(Instant::ofEpochMilli),
        version = remoteVersion,
    )

fun CampaignEntity.toDomain(): Campaign =
    Campaign(
        id = id,
        ownerId = ownerId,
        farmId = farmId,
        name = name,
        startDate = startDateEpochDay?.let(LocalDate::ofEpochDay),
        endDate = endDateEpochDay?.let(LocalDate::ofEpochDay),
        status = CampaignStatus.valueOf(status),
        createdAt = Instant.ofEpochMilli(createdAtEpochMs),
        updatedAt = Instant.ofEpochMilli(updatedAtEpochMs),
        deletedAt = deletedAtEpochMs?.let(Instant::ofEpochMilli),
        version = remoteVersion,
    )

fun CampaignParcelEntity.toDomain(): CampaignParcel =
    CampaignParcel(
        id = id,
        ownerId = ownerId,
        campaignId = campaignId,
        parcelId = parcelId,
        createdAt = Instant.ofEpochMilli(createdAtEpochMs),
        updatedAt = Instant.ofEpochMilli(updatedAtEpochMs),
        deletedAt = deletedAtEpochMs?.let(Instant::ofEpochMilli),
        version = remoteVersion,
    )

class RoomFarmRepository(
    private val farms: FarmDao,
    private val writes: FieldWriteDao,
) : FarmRepository {
    override fun observeByOwner(ownerId: String): Flow<List<Farm>> =
        farms.observeByOwner(ownerId).map { rows -> rows.map(FarmEntity::toDomain) }

    override fun observeById(id: String): Flow<Farm?> =
        farms.observeById(id).map { it?.takeIf { row -> row.deletedAtEpochMs == null }?.toDomain() }

    override suspend fun getById(id: String): Farm? =
        farms.findById(id)?.takeIf { it.deletedAtEpochMs == null }?.toDomain()

    override suspend fun upsert(farm: Farm) {
        val current = farms.findById(farm.id)
        val entity = farm.toEntity(current?.coverImageUri, current)
        writes.upsertFarmWithOutbox(entity, entity.outbox("farm"))
    }

    override suspend fun softDelete(id: String, deletedAt: Instant) {
        val current = farms.findById(id) ?: return
        val entity = current.copy(
            deletedAtEpochMs = deletedAt.toEpochMilli(),
            updatedAtEpochMs = deletedAt.toEpochMilli(),
            syncState = PENDING_DELETE,
        )
        writes.upsertFarmWithOutbox(entity, entity.outbox("farm", "delete"))
    }
}

class RoomParcelRepository(
    private val plots: PlotDao,
    private val writes: FieldWriteDao,
) : ParcelRepository {
    override fun observeByFarm(farmId: String): Flow<List<Parcel>> =
        plots.observeByFarm(farmId).map { rows -> rows.map(PlotEntity::toDomain) }

    override fun observeById(id: String): Flow<Parcel?> =
        plots.observeById(id).map { it?.takeIf { row -> row.deletedAtEpochMs == null }?.toDomain() }

    override suspend fun getById(id: String): Parcel? =
        plots.findById(id)?.takeIf { it.deletedAtEpochMs == null }?.toDomain()

    override suspend fun upsert(parcel: Parcel) {
        val current = plots.findById(parcel.id)
        val entity = parcel.toEntity(current)
        writes.upsertPlotWithOutbox(entity, entity.outbox("plot"))
    }

    override suspend fun softDelete(id: String, deletedAt: Instant) {
        val current = plots.findById(id) ?: return
        val entity = current.copy(
            deletedAtEpochMs = deletedAt.toEpochMilli(),
            updatedAtEpochMs = deletedAt.toEpochMilli(),
            syncState = PENDING_DELETE,
        )
        writes.upsertPlotWithOutbox(entity, entity.outbox("plot", "delete"))
    }
}

class RoomCampaignRepository(
    private val campaigns: CampaignDao,
    private val writes: FieldWriteDao,
) : CampaignRepository {
    override fun observeByFarm(farmId: String): Flow<List<Campaign>> =
        campaigns.observeByFarm(farmId).map { rows -> rows.map(CampaignEntity::toDomain) }

    override fun observeById(id: String): Flow<Campaign?> =
        campaigns.observeById(id).map {
            it?.takeIf { row -> row.deletedAtEpochMs == null }?.toDomain()
        }

    override suspend fun getById(id: String): Campaign? =
        campaigns.findById(id)?.takeIf { it.deletedAtEpochMs == null }?.toDomain()

    override suspend fun upsert(campaign: Campaign) {
        val current = campaigns.findById(campaign.id)
        val entity = campaign.toEntity(current)
        writes.upsertCampaignWithOutbox(entity, entity.outbox("campaign"))
    }

    override suspend fun softDelete(id: String, deletedAt: Instant) {
        val current = campaigns.findById(id) ?: return
        val entity = current.copy(
            deletedAtEpochMs = deletedAt.toEpochMilli(),
            updatedAtEpochMs = deletedAt.toEpochMilli(),
            syncState = PENDING_DELETE,
        )
        writes.upsertCampaignWithOutbox(entity, entity.outbox("campaign", "delete"))
    }
}

class RoomCampaignParcelRepository(
    private val links: CampaignParcelDao,
    private val writes: FieldWriteDao,
) : CampaignParcelRepository {
    override fun observeByCampaign(campaignId: String): Flow<List<CampaignParcel>> =
        links.observeByCampaign(campaignId).map { rows -> rows.map(CampaignParcelEntity::toDomain) }

    override suspend fun get(campaignId: String, parcelId: String): CampaignParcel? =
        links.findActive(campaignId, parcelId)?.toDomain()

    override suspend fun upsert(link: CampaignParcel) {
        val current = links.findById(link.id)
        val entity = link.toEntity(current)
        writes.upsertCampaignParcelWithOutbox(entity, entity.outbox("campaign_parcel"))
    }

    override suspend fun softDelete(id: String, deletedAt: Instant) {
        val current = links.findById(id) ?: return
        val entity = current.copy(
            deletedAtEpochMs = deletedAt.toEpochMilli(),
            updatedAtEpochMs = deletedAt.toEpochMilli(),
            syncState = PENDING_DELETE,
        )
        writes.upsertCampaignParcelWithOutbox(
            entity,
            entity.outbox("campaign_parcel", "delete"),
        )
    }
}

private fun Farm.toEntity(
    legacyCoverImageUri: String?,
    current: FarmEntity?,
): FarmEntity =
    FarmEntity(
        id = id,
        ownerId = ownerId,
        name = name,
        municipality = municipality,
        province = province,
        description = description,
        coverImageUri = legacyCoverImageUri,
        coverDocumentId = coverDocumentId,
        createdAtEpochMs = createdAt.toEpochMilli(),
        updatedAtEpochMs = updatedAt.toEpochMilli(),
        deletedAtEpochMs = deletedAt?.toEpochMilli(),
        remoteVersion = version,
        baseRemoteVersion = current?.baseRemoteVersion ?: 0L,
        syncState = if (deletedAt == null) PENDING_UPLOAD else PENDING_DELETE,
        lastSyncedAtEpochMs = current?.lastSyncedAtEpochMs,
    )

private fun Parcel.toEntity(current: PlotEntity?): PlotEntity =
    PlotEntity(
        id = id,
        ownerId = ownerId,
        farmId = farmId,
        name = alias,
        cadastralReference = cadastralReference,
        areaHa = area?.hectares?.toDouble(),
        areaSquareMetersDecimal = area?.squareMeters?.toPlainString(),
        oliveTreeCount = oliveTreeCount,
        mainVariety = mainVariety,
        boundaryGeoJson = geometry?.geoJson,
        boundarySource = geometrySource?.toStorageValue(),
        createdAtEpochMs = createdAt.toEpochMilli(),
        updatedAtEpochMs = updatedAt.toEpochMilli(),
        deletedAtEpochMs = deletedAt?.toEpochMilli(),
        remoteVersion = version,
        baseRemoteVersion = current?.baseRemoteVersion ?: 0L,
        syncState = if (deletedAt == null) PENDING_UPLOAD else PENDING_DELETE,
        lastSyncedAtEpochMs = current?.lastSyncedAtEpochMs,
    )

private fun Campaign.toEntity(current: CampaignEntity?): CampaignEntity =
    CampaignEntity(
        id = id,
        ownerId = ownerId,
        farmId = farmId,
        name = name,
        startDateEpochDay = startDate?.toEpochDay(),
        endDateEpochDay = endDate?.toEpochDay(),
        status = status.name,
        createdAtEpochMs = createdAt.toEpochMilli(),
        updatedAtEpochMs = updatedAt.toEpochMilli(),
        deletedAtEpochMs = deletedAt?.toEpochMilli(),
        remoteVersion = version,
        baseRemoteVersion = current?.baseRemoteVersion ?: 0L,
        syncState = if (deletedAt == null) PENDING_UPLOAD else PENDING_DELETE,
        lastSyncedAtEpochMs = current?.lastSyncedAtEpochMs,
    )

private fun CampaignParcel.toEntity(current: CampaignParcelEntity?): CampaignParcelEntity =
    CampaignParcelEntity(
        id = id,
        ownerId = ownerId,
        campaignId = campaignId,
        parcelId = parcelId,
        createdAtEpochMs = createdAt.toEpochMilli(),
        updatedAtEpochMs = updatedAt.toEpochMilli(),
        deletedAtEpochMs = deletedAt?.toEpochMilli(),
        remoteVersion = version,
        baseRemoteVersion = current?.baseRemoteVersion ?: 0L,
        syncState = if (deletedAt == null) PENDING_UPLOAD else PENDING_DELETE,
        lastSyncedAtEpochMs = current?.lastSyncedAtEpochMs,
    )

private fun FarmEntity.outbox(type: String, operation: String = "upsert") =
    SyncOutboxEntity(type, id, operation, updatedAtEpochMs)

private fun PlotEntity.outbox(type: String, operation: String = "upsert") =
    SyncOutboxEntity(type, id, operation, updatedAtEpochMs)

private fun CampaignEntity.outbox(type: String, operation: String = "upsert") =
    SyncOutboxEntity(type, id, operation, updatedAtEpochMs)

private fun CampaignParcelEntity.outbox(type: String, operation: String = "upsert") =
    SyncOutboxEntity(type, id, operation, updatedAtEpochMs)

private fun String.toGeometrySource(): GeometrySource =
    when (lowercase()) {
        "catastro" -> GeometrySource.CATASTRO
        "manual_map", "manual_gps", "manual" -> GeometrySource.MANUAL
        "imported", "import" -> GeometrySource.IMPORT
        else -> GeometrySource.OTHER
    }

private fun GeometrySource.toStorageValue(): String =
    when (this) {
        GeometrySource.CATASTRO -> "catastro"
        GeometrySource.MANUAL -> "manual_map"
        GeometrySource.IMPORT -> "imported"
        GeometrySource.OTHER -> "other"
    }
