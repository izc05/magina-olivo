package com.isivolt.maginaolivo.data.sync

import com.isivolt.maginaolivo.data.local.FarmEntity
import com.isivolt.maginaolivo.data.local.PlotEntity
import com.isivolt.maginaolivo.data.local.SyncOutboxEntity
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class FieldSyncProcessorTest {

    @Test
    fun successfulBatchUploadsFarmThenPlotAndClearsOutbox() = runBlocking {
        val farm = FarmEntity(
            id = "11111111-1111-4111-8111-111111111111",
            name = "Finca",
            coverImageUri = null,
            updatedAtEpochMs = 1_000L,
            syncState = "pending_upload",
        )
        val plot = PlotEntity(
            id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
            farmId = farm.id,
            name = "Parcela",
            cadastralReference = "23013A00700198",
            areaHa = 1.2,
            boundaryGeoJson = """{"type":"Polygon","coordinates":[]}""",
            boundarySource = "catastro",
            updatedAtEpochMs = 2_000L,
            syncState = "pending_upload",
        )
        val farmEntry = SyncOutboxEntity(
            entityType = "farm",
            entityId = farm.id,
            operation = "upsert",
            enqueuedAtEpochMs = 1_000L,
        )
        val plotEntry = SyncOutboxEntity(
            entityType = "plot",
            entityId = plot.id,
            operation = "upsert",
            enqueuedAtEpochMs = 2_000L,
        )
        val local = FakeLocalStore(
            entries = mutableListOf(farmEntry, plotEntry),
            farms = mutableMapOf(farm.id to farm),
            plots = mutableMapOf(plot.id to plot),
        )
        val remote = FakeRemoteGateway()

        val result = FieldSyncProcessor(local, remote).processPending(limit = 10)

        assertEquals(2, result.syncedCount)
        assertEquals(0, result.failedCount)
        assertEquals(
            listOf("farm:" + farm.id, "plot:" + plot.id),
            remote.calls,
        )
        assertTrue(local.entries.isEmpty())
        assertEquals("synced", local.farms.getValue(farm.id).syncState)
        assertEquals("synced", local.plots.getValue(plot.id).syncState)
    }

    @Test
    fun remoteFailureKeepsOutboxMarksErrorAndStopsBatch() = runBlocking {
        val farm = FarmEntity(
            id = "11111111-1111-4111-8111-111111111111",
            name = "Finca",
            coverImageUri = null,
            updatedAtEpochMs = 1_000L,
            syncState = "pending_upload",
        )
        val plot = PlotEntity(
            id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
            farmId = farm.id,
            name = "Parcela",
            cadastralReference = "23013A00700198",
            areaHa = 1.2,
            boundaryGeoJson = null,
            boundarySource = "catastro",
            updatedAtEpochMs = 2_000L,
            syncState = "pending_upload",
        )
        val farmEntry = SyncOutboxEntity("farm", farm.id, "upsert", 1_000L)
        val plotEntry = SyncOutboxEntity("plot", plot.id, "upsert", 2_000L)
        val local = FakeLocalStore(
            entries = mutableListOf(farmEntry, plotEntry),
            farms = mutableMapOf(farm.id to farm),
            plots = mutableMapOf(plot.id to plot),
        )
        val remote = FakeRemoteGateway(failFarm = true)

        val result = FieldSyncProcessor(local, remote).processPending(limit = 10)

        assertEquals(0, result.syncedCount)
        assertEquals(1, result.failedCount)
        assertEquals(listOf("farm:" + farm.id), remote.calls)
        assertEquals(2, local.entries.size)
        val failed = local.entries.first()
        assertEquals(1, failed.attemptCount)
        assertTrue(failed.lastError?.contains("REMOTE_FARM_FAILURE") == true)
        assertEquals("pending_upload", local.farms.getValue(farm.id).syncState)
        assertEquals("pending_upload", local.plots.getValue(plot.id).syncState)
    }

    @Test
    fun missingLocalEntityIsRecordedAndNotDropped() = runBlocking {
        val entry = SyncOutboxEntity(
            entityType = "farm",
            entityId = "11111111-1111-4111-8111-111111111111",
            operation = "upsert",
            enqueuedAtEpochMs = 1_000L,
        )
        val local = FakeLocalStore(entries = mutableListOf(entry))
        val remote = FakeRemoteGateway()

        val result = FieldSyncProcessor(local, remote).processPending(limit = 10)

        assertEquals(0, result.syncedCount)
        assertEquals(1, result.failedCount)
        assertTrue(
            local.entries.single().lastError?.contains("LOCAL_FARM_MISSING") == true,
        )
        assertTrue(remote.calls.isEmpty())
    }

    private class FakeRemoteGateway(
        private val failFarm: Boolean = false,
        private val failPlot: Boolean = false,
    ) : FieldRemoteGateway {
        val calls = mutableListOf<String>()

        override suspend fun upsertFarm(farm: FarmUpsertPayload) {
            calls += "farm:" + farm.id
            if (failFarm) error("REMOTE_FARM_FAILURE")
        }

        override suspend fun upsertPlot(plot: PlotUpsertPayload) {
            calls += "plot:" + plot.id
            if (failPlot) error("REMOTE_PLOT_FAILURE")
        }
    }

    private class FakeLocalStore(
        val entries: MutableList<SyncOutboxEntity>,
        val farms: MutableMap<String, FarmEntity> = mutableMapOf(),
        val plots: MutableMap<String, PlotEntity> = mutableMapOf(),
    ) : FieldSyncLocalStore {
        override suspend fun pending(limit: Int): List<SyncOutboxEntity> =
            entries.take(limit)

        override suspend fun findFarm(id: String): FarmEntity? = farms[id]

        override suspend fun findPlot(id: String): PlotEntity? = plots[id]

        override suspend fun markFarmSynced(entry: SyncOutboxEntity) {
            farms[entry.entityId] = farms.getValue(entry.entityId)
                .copy(syncState = "synced")
            entries.removeIf {
                it.entityType == entry.entityType && it.entityId == entry.entityId
            }
        }

        override suspend fun markPlotSynced(entry: SyncOutboxEntity) {
            plots[entry.entityId] = plots.getValue(entry.entityId)
                .copy(syncState = "synced")
            entries.removeIf {
                it.entityType == entry.entityType && it.entityId == entry.entityId
            }
        }

        override suspend fun markFailed(
            entry: SyncOutboxEntity,
            message: String,
        ) {
            val index = entries.indexOfFirst {
                it.entityType == entry.entityType && it.entityId == entry.entityId
            }
            entries[index] = entries[index].copy(
                attemptCount = entries[index].attemptCount + 1,
                lastError = message,
            )
        }
    }
}
