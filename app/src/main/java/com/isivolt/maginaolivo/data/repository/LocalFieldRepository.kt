package com.isivolt.maginaolivo.data.repository

import com.isivolt.maginaolivo.data.local.FarmDao
import com.isivolt.maginaolivo.data.local.FarmEntity
import com.isivolt.maginaolivo.data.local.FieldWriteDao
import com.isivolt.maginaolivo.data.local.PlotDao
import com.isivolt.maginaolivo.data.local.PlotEntity
import com.isivolt.maginaolivo.data.local.SyncOutboxEntity
import com.isivolt.maginaolivo.domain.catastro.CatastroParcel
import java.util.UUID
import kotlinx.coroutines.flow.Flow

class LocalFieldRepository(
    private val farmDao: FarmDao,
    private val plotDao: PlotDao,
    private val fieldWriteDao: FieldWriteDao,
    private val clock: () -> Long = System::currentTimeMillis,
    private val idFactory: () -> String = { UUID.randomUUID().toString() },
) {
    fun observeFarms(): Flow<List<FarmEntity>> = farmDao.observeAll()

    fun observePlots(): Flow<List<PlotEntity>> = plotDao.observeAll()

    fun observePlots(farmId: String): Flow<List<PlotEntity>> = plotDao.observeByFarm(farmId)

    suspend fun createFarm(
        name: String,
        coverImageUri: String? = null,
    ): FarmEntity {
        val normalizedName = name.trim()
        require(normalizedName.isNotEmpty()) { "FARM_NAME_REQUIRED" }

        return FarmEntity(
            id = idFactory(),
            name = normalizedName,
            coverImageUri = coverImageUri,
            updatedAtEpochMs = clock(),
            syncState = SyncState.PENDING_UPLOAD,
        ).also { farm ->
            fieldWriteDao.upsertFarmWithOutbox(
                farm = farm,
                outbox = SyncOutboxEntity(
                    entityType = "farm",
                    entityId = farm.id,
                    operation = "upsert",
                    enqueuedAtEpochMs = farm.updatedAtEpochMs,
                ),
            )
        }
    }

    suspend fun importCatastroParcel(
        farmId: String,
        parcel: CatastroParcel,
        workingName: String,
    ): Result<PlotEntity> = runCatching {
        val existing = plotDao.findByCadastralReference(parcel.cadastralReference)
        check(existing == null) { "CADASTRAL_REFERENCE_ALREADY_ADDED" }

        val normalizedName = workingName.trim()
        require(normalizedName.isNotEmpty()) { "PLOT_NAME_REQUIRED" }

        PlotEntity(
            id = idFactory(),
            farmId = farmId,
            name = normalizedName,
            cadastralReference = parcel.cadastralReference,
            areaHa = parcel.areaM2?.div(10_000.0),
            boundaryGeoJson = parcel.geometryGeoJson,
            boundarySource = BoundarySource.CATASTRO,
            updatedAtEpochMs = clock(),
            syncState = SyncState.PENDING_UPLOAD,
        ).also { plot ->
            fieldWriteDao.upsertPlotWithOutbox(
                plot = plot,
                outbox = SyncOutboxEntity(
                    entityType = "plot",
                    entityId = plot.id,
                    operation = "upsert",
                    enqueuedAtEpochMs = plot.updatedAtEpochMs,
                ),
            )
        }
    }

    private object SyncState {
        const val PENDING_UPLOAD = "pending_upload"
    }

    private object BoundarySource {
        const val CATASTRO = "catastro"
    }
}
