package com.isivolt.maginaolivo.data.sync

import android.content.Context
import androidx.room.Room
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import com.isivolt.maginaolivo.BuildConfig
import com.isivolt.maginaolivo.data.local.FarmEntity
import com.isivolt.maginaolivo.data.local.MaginaOlivoDatabase
import com.isivolt.maginaolivo.data.local.PlotEntity
import com.isivolt.maginaolivo.data.local.SyncOutboxEntity
import com.isivolt.maginaolivo.data.remote.SupabaseProvider
import io.github.jan.supabase.postgrest.postgrest
import java.util.UUID
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class FieldSyncRemoteE2ETest {

    @Test
    fun pendingFarmAndPlotSyncToSupabaseAndClearOutbox() = runBlocking {
        check(BuildConfig.SUPABASE_URL.isNotBlank()) { "SUPABASE_URL_REQUIRED" }
        check(BuildConfig.SUPABASE_PUBLISHABLE_KEY.isNotBlank()) {
            "SUPABASE_PUBLISHABLE_KEY_REQUIRED"
        }

        val client = checkNotNull(SupabaseProvider.client) {
            "SUPABASE_CLIENT_NOT_CONFIGURED"
        }

        val context: Context = InstrumentationRegistry
            .getInstrumentation()
            .targetContext
        val database = Room.inMemoryDatabaseBuilder(
            context,
            MaginaOlivoDatabase::class.java,
        ).build()

        val farmId = UUID.randomUUID().toString()
        val plotId = UUID.randomUUID().toString()
        val now = System.currentTimeMillis()

        try {
            val farm = FarmEntity(
                id = farmId,
                name = "Finca Sync E2E",
                coverImageUri = null,
                updatedAtEpochMs = now,
                syncState = "pending_upload",
            )
            val plot = PlotEntity(
                id = plotId,
                farmId = farmId,
                name = "Parcela Sync E2E",
                cadastralReference = null,
                areaHa = 1.2345,
                boundaryGeoJson =
                    """{"type":"Polygon","coordinates":[]}""",
                boundarySource = "catastro",
                updatedAtEpochMs = now + 1,
                syncState = "pending_upload",
            )

            database.fieldWriteDao().upsertFarmWithOutbox(
                farm,
                SyncOutboxEntity(
                    entityType = "farm",
                    entityId = farmId,
                    operation = "upsert",
                    enqueuedAtEpochMs = now,
                ),
            )
            database.fieldWriteDao().upsertPlotWithOutbox(
                plot,
                SyncOutboxEntity(
                    entityType = "plot",
                    entityId = plotId,
                    operation = "upsert",
                    enqueuedAtEpochMs = now + 1,
                ),
            )

            val processor = FieldSyncProcessor(
                local = RoomFieldSyncLocalStore(database),
                remote = SupabaseFieldRemoteGateway(client),
            )

            val result = processor.processPending(limit = 10)

            assertEquals(2, result.syncedCount)
            assertEquals(0, result.failedCount)
            assertEquals(
                "synced",
                database.farmDao().findById(farmId)?.syncState,
            )
            assertEquals(
                "synced",
                database.plotDao().findById(plotId)?.syncState,
            )
            assertNull(
                database.syncOutboxDao().findByEntity("farm", farmId),
            )
            assertNull(
                database.syncOutboxDao().findByEntity("plot", plotId),
            )

            val remoteFarm = client.postgrest["farms"]
                .select { eq("id", farmId) }
                .decodeList<RemoteFarmRow>()
                .singleOrNull()
            val remotePlot = client.postgrest["plots"]
                .select { eq("id", plotId) }
                .decodeList<RemotePlotRow>()
                .singleOrNull()

            assertNotNull(remoteFarm)
            assertNotNull(remotePlot)
            assertEquals("Finca Sync E2E", remoteFarm?.name)
            assertEquals(farmId, remotePlot?.farmId)
            assertEquals(1.2345, remotePlot?.areaHa ?: 0.0, 0.0000001)
        } finally {
            runCatching {
                client.postgrest["farms"].delete {
                    eq("id", farmId)
                }
            }
            database.close()
        }
    }
}
