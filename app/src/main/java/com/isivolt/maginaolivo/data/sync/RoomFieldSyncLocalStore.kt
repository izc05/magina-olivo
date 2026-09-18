package com.isivolt.maginaolivo.data.sync

import androidx.room.withTransaction
import com.isivolt.maginaolivo.data.local.FarmEntity
import com.isivolt.maginaolivo.data.local.MaginaOlivoDatabase
import com.isivolt.maginaolivo.data.local.PlotEntity
import com.isivolt.maginaolivo.data.local.SyncOutboxEntity

class RoomFieldSyncLocalStore(
    private val database: MaginaOlivoDatabase,
) : FieldSyncLocalStore {

    override suspend fun pending(limit: Int): List<SyncOutboxEntity> =
        database.syncOutboxDao().pending(limit)

    override suspend fun findFarm(id: String): FarmEntity? =
        database.farmDao().findById(id)

    override suspend fun findPlot(id: String): PlotEntity? =
        database.plotDao().findById(id)

    override suspend fun markFarmSynced(entry: SyncOutboxEntity) {
        database.withTransaction {
            database.farmDao().updateSyncState(entry.entityId, "synced")
            database.syncOutboxDao().delete(
                entry.entityType,
                entry.entityId,
            )
        }
    }

    override suspend fun markPlotSynced(entry: SyncOutboxEntity) {
        database.withTransaction {
            database.plotDao().updateSyncState(entry.entityId, "synced")
            database.syncOutboxDao().delete(
                entry.entityType,
                entry.entityId,
            )
        }
    }

    override suspend fun markFailed(
        entry: SyncOutboxEntity,
        message: String,
    ) {
        database.syncOutboxDao().markFailed(
            entityType = entry.entityType,
            entityId = entry.entityId,
            message = message.take(MAX_ERROR_LENGTH),
        )
    }

    private companion object {
        const val MAX_ERROR_LENGTH = 500
    }
}
