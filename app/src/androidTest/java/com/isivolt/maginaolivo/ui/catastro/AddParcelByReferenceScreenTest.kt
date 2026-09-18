package com.isivolt.maginaolivo.ui.catastro

import android.content.Context
import androidx.compose.material3.MaterialTheme
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.room.Room
import androidx.test.platform.app.InstrumentationRegistry
import com.isivolt.maginaolivo.data.local.FarmEntity
import com.isivolt.maginaolivo.data.local.MaginaOlivoDatabase
import com.isivolt.maginaolivo.data.repository.LocalFieldRepository
import com.isivolt.maginaolivo.domain.catastro.CatastroBbox
import com.isivolt.maginaolivo.domain.catastro.CatastroParcel
import com.isivolt.maginaolivo.domain.catastro.CatastroParcelGateway
import com.isivolt.maginaolivo.domain.catastro.NormalizedCadastralReference
import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Before
import org.junit.Rule
import org.junit.Test

class AddParcelByReferenceScreenTest {

    @get:Rule
    val composeRule = createComposeRule()

    private lateinit var database: MaginaOlivoDatabase
    private lateinit var repository: LocalFieldRepository
    private lateinit var farm: FarmEntity

    private val parcel = CatastroParcel(
        featureId = "23013A00700198",
        cadastralReference = "23013A00700198",
        label = "Parcela Catastro UI",
        areaM2 = 12_345.0,
        geometryGeoJson = """
            {
              "type":"Polygon",
              "coordinates":[[
                [-3.4130,37.8220],
                [-3.4120,37.8220],
                [-3.4120,37.8230],
                [-3.4130,37.8230],
                [-3.4130,37.8220]
              ]]
            }
        """.trimIndent(),
        geometryType = CatastroParcel.GeometryType.POLYGON,
        sourceCheckedAt = "2026-09-18T16:00:00Z",
    )

    private val fakeGateway = object : CatastroParcelGateway {
        override suspend fun findByReference(
            reference: NormalizedCadastralReference,
        ): Result<CatastroParcel> =
            if (reference.parcelReference == parcel.cadastralReference) {
                Result.success(parcel)
            } else {
                Result.failure(IllegalArgumentException("PARCEL_NOT_FOUND"))
            }

        override suspend fun findInViewport(
            bbox: CatastroBbox,
        ): Result<List<CatastroParcel>> = Result.success(listOf(parcel))
    }

    @Before
    fun setUp() {
        val context: Context = InstrumentationRegistry
            .getInstrumentation()
            .targetContext
        database = Room.inMemoryDatabaseBuilder(
            context,
            MaginaOlivoDatabase::class.java,
        ).build()

        val ids = sequenceOf("farm-ui-e2e", "plot-ui-e2e").iterator()
        repository = LocalFieldRepository(
            farmDao = database.farmDao(),
            plotDao = database.plotDao(),
            fieldWriteDao = database.fieldWriteDao(),
            clock = { 1_789_748_000_000L },
            idFactory = { ids.next() },
        )

        farm = runBlocking {
            repository.createFarm("Finca UI Catastro")
        }
    }

    @After
    fun tearDown() {
        database.close()
    }

    @Test
    fun parcelCanBeReviewedAndSavedFromCatastroScreen() {
        var saved = false

        composeRule.setContent {
            MaterialTheme {
                AddParcelByReferenceScreen(
                    farms = listOf(farm),
                    repository = repository,
                    gateway = fakeGateway,
                    initialReference = parcel.cadastralReference,
                    onBack = {},
                    onSaved = { saved = true },
                )
            }
        }

        composeRule.onNodeWithText("Buscar en Catastro").performClick()

        composeRule.waitUntil(timeoutMillis = 5_000) {
            composeRule
                .onAllNodesWithText(parcel.cadastralReference)
                .fetchSemanticsNodes()
                .size >= 2
        }

        composeRule.onNodeWithText("Superficie: 1.2345 ha").assertIsDisplayed()
        composeRule.onNodeWithText("Geometría: Polygon").assertIsDisplayed()
        composeRule.onNodeWithText("Guardar parcela").performClick()

        composeRule.waitUntil(timeoutMillis = 5_000) { saved }

        val stored = runBlocking {
            database.plotDao().findByCadastralReference(parcel.cadastralReference)
        }

        assertNotNull(stored)
        stored!!
        assertEquals("plot-ui-e2e", stored.id)
        assertEquals(farm.id, stored.farmId)
        assertEquals(parcel.cadastralReference, stored.cadastralReference)
        assertEquals(parcel.geometryGeoJson, stored.boundaryGeoJson)
        assertEquals("catastro", stored.boundarySource)
        assertEquals("pending_upload", stored.syncState)
    }
}
