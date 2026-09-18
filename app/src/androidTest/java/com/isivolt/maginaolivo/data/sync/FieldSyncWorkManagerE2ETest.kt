package com.isivolt.maginaolivo.data.sync

import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import com.isivolt.maginaolivo.BuildConfig
import com.isivolt.maginaolivo.MaginaOlivoApplication
import com.isivolt.maginaolivo.data.remote.SupabaseProvider
import com.isivolt.maginaolivo.domain.catastro.CatastroParcel
import io.github.jan.supabase.postgrest.postgrest
import kotlinx.coroutines.delay
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withTimeout
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class FieldSyncWorkManagerE2ETest {

    @Test
    fun localWritesSyncAutomaticallyWhenConnectivityIsAvailable() = runBlocking {
        check(BuildConfig.SUPABASE_URL.isNotBlank()) { "SUPABASE_URL_REQUIRED" }
        check(BuildConfig.SUPABASE_PUBLISHABLE_KEY.isNotBlank()) {
            "SUPABASE_PUBLISHABLE_KEY_REQUIRED"
        }

        val app = InstrumentationRegistry
            .getInstrumentation()
            .targetContext
            .applicationContext as MaginaOlivoApplication

        val client = checkNotNull(SupabaseProvider.client) {
            "SUPABASE_CLIENT_NOT_CONFIGURED"
        }

        val farm = app.fieldRepository.createFarm("Finca Auto Sync E2E")
        var plotId: String? = null

        try {
            val parcel = CatastroParcel(
                featureId = "23013A00700998",
                cadastralReference = "23013A00700998",
                label = "Parcela Auto Sync E2E",
                areaM2 = 9_876.0,
                geometryGeoJson =
                    """{"type":"Polygon","coordinates":[]}""",
                geometryType = CatastroParcel.GeometryType.POLYGON,
                sourceCheckedAt = "2026-09-18T19:00:00Z",
            )

            val plot = app.fieldRepository.importCatastroParcel(
                farmId = farm.id,
                parcel = parcel,
                workingName = "Parcela Auto Sync E2E",
            ).getOrThrow()
            plotId = plot.id

            withTimeout(90_000L) {
                while (true) {
                    val storedFarm = app.database.farmDao().findById(farm.id)
                    val storedPlot = app.database.plotDao().findById(plot.id)
                    val farmOutbox = app.database.syncOutboxDao()
                        .findByEntity("farm", farm.id)
                    val plotOutbox = app.database.syncOutboxDao()
                        .findByEntity("plot", plot.id)

                    if (
                        storedFarm?.syncState == "synced" &&
                        storedPlot?.syncState == "synced" &&
                        farmOutbox == null &&
                        plotOutbox == null
                    ) {
                        break
                    }

                    delay(500L)
                }
            }

            assertEquals(
                "synced",
                app.database.farmDao().findById(farm.id)?.syncState,
            )
            assertEquals(
                "synced",
                app.database.plotDao().findById(plot.id)?.syncState,
            )
            assertNull(
                app.database.syncOutboxDao().findByEntity("farm", farm.id),
            )
            assertNull(
                app.database.syncOutboxDao().findByEntity("plot", plot.id),
            )

            val remoteFarm = client.postgrest["farms"]
                .select {
                    filter {
                        eq("id", farm.id)
                    }
                }
                .decodeList<RemoteFarmRow>()
                .singleOrNull()
            val remotePlot = client.postgrest["plots"]
                .select {
                    filter {
                        eq("id", plot.id)
                    }
                }
                .decodeList<RemotePlotRow>()
                .singleOrNull()

            assertNotNull(remoteFarm)
            assertNotNull(remotePlot)
            assertEquals(farm.id, remotePlot?.farmId)
            assertEquals("Parcela Auto Sync E2E", remotePlot?.name)
        } finally {
            runCatching {
                client.postgrest["farms"].delete {
                    filter {
                        eq("id", farm.id)
                    }
                }
            }

            plotId?.let {
                // Local test DB is discarded with the emulator job; remote plot
                // is removed by the farm ON DELETE CASCADE.
            }
        }
    }
}
