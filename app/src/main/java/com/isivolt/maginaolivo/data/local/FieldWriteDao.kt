package com.isivolt.maginaolivo.data.local

import androidx.room.Dao
import androidx.room.Transaction
import androidx.room.Upsert

@Dao
abstract class FieldWriteDao {
    @Upsert
    protected abstract suspend fun upsertFarm(farm: FarmEntity)

    @Upsert
    protected abstract suspend fun upsertPlot(plot: PlotEntity)

    @Upsert
    protected abstract suspend fun upsertOutbox(entry: SyncOutboxEntity)

    @Transaction
    open suspend fun upsertFarmWithOutbox(
        farm: FarmEntity,
        outbox: SyncOutboxEntity,
    ) {
        upsertFarm(farm)
        upsertOutbox(outbox)
    }

    @Transaction
    open suspend fun upsertPlotWithOutbox(
        plot: PlotEntity,
        outbox: SyncOutboxEntity,
    ) {
        upsertPlot(plot)
        upsertOutbox(outbox)
    }
}
