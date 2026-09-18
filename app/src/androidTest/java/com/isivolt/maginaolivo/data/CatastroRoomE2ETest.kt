package com.isivolt.maginaolivo.data

import android.content.Context
import androidx.room.Room
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import com.isivolt.maginaolivo.BuildConfig
import com.isivolt.maginaolivo.data.local.MaginaOlivoDatabase
import com.isivolt.maginaolivo.data.remote.SupabaseCatastroParcelGateway
import com.isivolt.maginaolivo.data.remote.SupabaseProvider
import com.isivolt.maginaolivo.data.repository.LocalFieldRepository
import com.isivolt.maginaolivo.domain.catastro.CatastroBbox
import com.isivolt.maginaolivo.domain.catastro.normalizeCadastralReference
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class CatastroRoomE2ETest {

    @Test
    fun realCatastroParcelIsVerifiedAndPersistedOffline() = runBlocking {
        check(BuildConfig.SUPABASE_URL.isNotBlank()) { "SUPABASE_URL_REQUIRED" }
        check(BuildConfig.SUPABASE_PUBLISHABLE_KEY.isNotBlank()) {
            "SUPABASE_PUBLISHABLE_KEY_REQUIRED"
        }

        val client = checkNotNull(SupabaseProvider.client) {
            "SUPABASE_CLIENT_NOT_CONFIGURED"
        }
        val gateway = SupabaseCatastroParcelGateway(client)

        val candidates = gateway.findInViewport(
            CatastroBbox(
                minLongitude = -3.414,
                minLatitude = 37.821,
                maxLongitude = -3.410,
                maxLatitude = 37.825,
            ),
        ).getOrThrow()

        val candidate = candidates.firstOrNull { it.areaM2 != null }
            ?: error("CATASTRO_E2E_PARCEL_WITH_AREA_NOT_FOUND")

        val normalized = checkNotNull(
            normalizeCadastralReference(candidate.cadastralReference),
        ) { "CATASTRO_E2E_INVALID_REFERENCE" }

        val verified = gateway.findByReference(normalized).getOrThrow()
        assertEquals(candidate.cadastralReference, verified.cadastralReference)
        assertNotNull(verified.areaM2)
        assertTrue(verified.geometryGeoJson.isNotBlank())

        val context: Context = InstrumentationRegistry
            .getInstrumentation()
            .targetContext
        val database = Room.inMemoryDatabaseBuilder(
            context,
            MaginaOlivoDatabase::class.java,
        ).build()

        try {
            val repository = LocalFieldRepository(
                farmDao = database.farmDao(),
                plotDao = database.plotDao(),
                fieldWriteDao = database.fieldWriteDao(),
                clock = { 1_789_748_000_000L },
                idFactory = sequenceOf("farm-e2e", "plot-e2e").iterator()::next,
            )

            val farm = repository.createFarm("Finca E2E Catastro")
            val imported = repository.importCatastroParcel(
                farmId = farm.id,
                parcel = verified,
                workingName = "Parcela E2E",
            ).getOrThrow()

            val stored = database.plotDao()
                .findByCadastralReference(verified.cadastralReference)

            assertNotNull(stored)
            stored!!
            assertEquals(imported.id, stored.id)
            assertEquals(farm.id, stored.farmId)
            assertEquals(verified.cadastralReference, stored.cadastralReference)
            assertEquals(verified.geometryGeoJson, stored.boundaryGeoJson)
            assertEquals("catastro", stored.boundarySource)
            assertEquals(
                checkNotNull(verified.areaM2) / 10_000.0,
                checkNotNull(stored.areaHa),
                0.0000001,
            )
            assertEquals("pending_upload", stored.syncState)
        } finally {
            database.close()
        }
    }
}
