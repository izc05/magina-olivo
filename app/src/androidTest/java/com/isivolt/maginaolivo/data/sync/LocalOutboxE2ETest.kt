package com.isivolt.maginaolivo.data.sync

import android.content.Context
import androidx.room.Room
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import com.isivolt.maginaolivo.data.local.FarmEntity
import com.isivolt.maginaolivo.data.local.MaginaOlivoDatabase
import com.isivolt.maginaolivo.data.local.PlotEntity
import com.isivolt.maginaolivo.data.local.SyncOutboxEntity
import com.isivolt.maginaolivo.data.repository.LocalFieldRepository
import com.isivolt.maginaolivo.domain.catastro.CatastroParcel
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class LocalOutboxE2ETest {

    @Test
    fun farmAndCatastroPlotArePersistedWithPendingUpserts() = runBlocking {
        val context: Context = InstrumentationRegistry
            .getInstrumentation()
            .targetContext

        val database = Room.inMemoryDatabaseBuilder(
            context,
            MaginaOlivoDatabase::class.java,
        ).build()

        try {
            val ids = sequenceOf(
                "11111111-1111-4111-8111-111111111111",
                "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
            ).iterator()

            val repository = LocalFieldRepository(
                farmDao = database.farmDao(),
                plotDao = database.plotDao(),
                fieldWriteDao = database.fieldWriteDao(),
                clock = { 1_789_750_800_000L },
                idFactory = { ids.next() },
            )

            val farm = repository.createFarm("Finca offline")

            val farmOutbox = database.syncOutboxDao()
                .findByEntity("farm", farm.id)

            assertNotNull(farmOutbox)
            farmOutbox!!
            assertEquals("upsert", farmOutbox.operation)
            assertEquals(0, farmOutbox.attemptCount)
            assertEquals(null, farmOutbox.lastError)

            val parcel = CatastroParcel(
                featureId = "23013A00700198",
                cadastralReference = "23013A00700198",
                label = "Parcela 198",
                areaM2 = 12_345.0,
                geometryGeoJson =
                    """{"type":"Polygon","coordinates":[]}""",
                geometryType = CatastroParcel.GeometryType.POLYGON,
                sourceCheckedAt = "2026-09-18T17:00:00Z",
            )

            val plot = repository.importCatastroParcel(
                farmId = farm.id,
                parcel = parcel,
                workingName = "Parcela offline",
            ).getOrThrow()

            val plotOutbox = database.syncOutboxDao()
                .findByEntity("plot", plot.id)

            assertNotNull(plotOutbox)
            plotOutbox!!
            assertEquals("upsert", plotOutbox.operation)
            assertEquals(0, plotOutbox.attemptCount)
            assertEquals(null, plotOutbox.lastError)

            val pending = database.syncOutboxDao().pending(limit = 10)
            assertEquals(2, pending.size)
            assertEquals(
                setOf("farm" to farm.id, "plot" to plot.id),
                pending.map { it.entityType to it.entityId }.toSet(),
            )
        } finally {
            database.close()
        }
    }

    @Test
    fun farmIsDequeuedBeforeOlderPlotToProtectRemoteForeignKey() = runBlocking {
        val context: Context = InstrumentationRegistry
            .getInstrumentation()
            .targetContext

        val database = Room.inMemoryDatabaseBuilder(
            context,
            MaginaOlivoDatabase::class.java,
        ).build()

        try {
            val plotTimestamp = 1_789_750_800_000L
            val farmTimestamp = plotTimestamp + 1_000L
            val farmId = "11111111-1111-4111-8111-111111111111"
            val plotId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"

            database.fieldWriteDao().upsertPlotWithOutbox(
                plot = PlotEntity(
                    id = plotId,
                    farmId = farmId,
                    name = "Parcela primero",
                    cadastralReference = "23013A00700198",
                    areaHa = 1.0,
                    boundaryGeoJson = null,
                    boundarySource = "catastro",
                    updatedAtEpochMs = plotTimestamp,
                    syncState = "pending_upload",
                ),
                outbox = SyncOutboxEntity(
                    entityType = "plot",
                    entityId = plotId,
                    operation = "upsert",
                    enqueuedAtEpochMs = plotTimestamp,
                ),
            )

            database.fieldWriteDao().upsertFarmWithOutbox(
                farm = FarmEntity(
                    id = farmId,
                    name = "Finca después",
                    coverImageUri = null,
                    updatedAtEpochMs = farmTimestamp,
                    syncState = "pending_upload",
                ),
                outbox = SyncOutboxEntity(
                    entityType = "farm",
                    entityId = farmId,
                    operation = "upsert",
                    enqueuedAtEpochMs = farmTimestamp,
                ),
            )

            val pending = database.syncOutboxDao().pending(limit = 10)

            assertEquals(
                listOf("farm", "plot"),
                pending.map { it.entityType },
            )
        } finally {
            database.close()
        }
    }

}
