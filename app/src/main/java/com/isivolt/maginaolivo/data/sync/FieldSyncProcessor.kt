package com.isivolt.maginaolivo.data.sync

import com.isivolt.maginaolivo.data.local.FarmEntity
import com.isivolt.maginaolivo.data.local.PlotEntity
import com.isivolt.maginaolivo.data.local.SyncOutboxEntity

interface FieldRemoteGateway {
    suspend fun upsertFarm(farm: FarmUpsertPayload)
    suspend fun upsertPlot(plot: PlotUpsertPayload)
}

interface FieldSyncLocalStore {
    suspend fun pending(limit: Int): List<SyncOutboxEntity>
    suspend fun findFarm(id: String): FarmEntity?
    suspend fun findPlot(id: String): PlotEntity?
    suspend fun markFarmSynced(entry: SyncOutboxEntity)
    suspend fun markPlotSynced(entry: SyncOutboxEntity)
    suspend fun markFailed(entry: SyncOutboxEntity, message: String)
}

data class FieldSyncBatchResult(
    val syncedCount: Int,
    val failedCount: Int,
)

class FieldSyncProcessor(
    private val local: FieldSyncLocalStore,
    private val remote: FieldRemoteGateway,
) {
    suspend fun processPending(limit: Int = 50): FieldSyncBatchResult {
        require(limit > 0) { "SYNC_LIMIT_MUST_BE_POSITIVE" }

        var synced = 0
        var failed = 0

        for (entry in local.pending(limit)) {
            try {
                check(entry.operation == "upsert") {
                    "UNSUPPORTED_SYNC_OPERATION:" + entry.operation
                }

                when (entry.entityType) {
                    "farm" -> {
                        val farm = local.findFarm(entry.entityId)
                            ?: error("LOCAL_FARM_MISSING:" + entry.entityId)
                        remote.upsertFarm(farm.toRemoteUpsert())
                        local.markFarmSynced(entry)
                    }

                    "plot" -> {
                        val plot = local.findPlot(entry.entityId)
                            ?: error("LOCAL_PLOT_MISSING:" + entry.entityId)
                        remote.upsertPlot(plot.toRemoteUpsert())
                        local.markPlotSynced(entry)
                    }

                    else -> error(
                        "UNSUPPORTED_SYNC_ENTITY:" + entry.entityType,
                    )
                }

                synced += 1
            } catch (error: Throwable) {
                local.markFailed(
                    entry,
                    error.message ?: error::class.simpleName ?: "SYNC_FAILURE",
                )
                failed += 1
                break
            }
        }

        return FieldSyncBatchResult(
            syncedCount = synced,
            failedCount = failed,
        )
    }
}
