package com.isivolt.maginaolivo.ui.map

import android.content.Context
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.click
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performTouchInput
import androidx.room.Room
import androidx.test.platform.app.InstrumentationRegistry
import com.isivolt.maginaolivo.data.local.FarmEntity
import com.isivolt.maginaolivo.data.local.MaginaOlivoDatabase
import com.isivolt.maginaolivo.data.repository.LocalFieldRepository
import com.isivolt.maginaolivo.domain.catastro.CatastroBbox
import com.isivolt.maginaolivo.domain.catastro.CatastroParcel
import com.isivolt.maginaolivo.domain.catastro.CatastroParcelGateway
import com.isivolt.maginaolivo.domain.catastro.NormalizedCadastralReference
import com.isivolt.maginaolivo.ui.catastro.AddParcelByReferenceScreen
import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Before
import org.junit.Rule
import org.junit.Test

class PlotMapCatastroFlowE2ETest {

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
        sourceCheckedAt = "2026-09-18T17:00:00Z",
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

        val ids = sequenceOf("farm-map-e2e", "plot-map-e2e").iterator()
        repository = LocalFieldRepository(
            farmDao = database.farmDao(),
            plotDao = database.plotDao(),
            fieldWriteDao = database.fieldWriteDao(),
            clock = { 1_789_752_000_000L },
            idFactory = { ids.next() },
        )

        farm = runBlocking {
            repository.createFarm("Finca MapLibre E2E")
        }
    }

    @After
    fun tearDown() {
        database.close()
    }

    @Test
    fun realMapTouchSelectsParcelAndOpensReviewBeforeSavingToRoom() {
        var mapReady = false
        var saved = false

        composeRule.setContent {
            var pendingReferences by remember {
                mutableStateOf<List<String>>(emptyList())
            }

            MaterialTheme {
                if (pendingReferences.isEmpty()) {
                    PlotMapScreen(
                        plots = emptyList(),
                        catastroGateway = fakeGateway,
                        onCatastroReferencesSelected = { references ->
                            pendingReferences = references
                        },
                        onBack = {},
                        initialLatitude = 37.8225,
                        initialLongitude = -3.4125,
                        initialZoom = 17.0,
                        forceOfflineStyle = true,
                        onMapReady = { mapReady = true },
                    )
                } else {
                    AddParcelByReferenceScreen(
                        farms = listOf(farm),
                        repository = repository,
                        gateway = fakeGateway,
                        initialReference = pendingReferences.first(),
                        onBack = { pendingReferences = emptyList() },
                        onSaved = { saved = true },
                    )
                }
            }
        }

        composeRule.waitUntil(timeoutMillis = 10_000) { mapReady }

        composeRule.onNodeWithText("Catastro").performClick()
        composeRule.waitUntil(timeoutMillis = 5_000) {
            runCatching {
                composeRule
                    .onNodeWithText("Toca una parcela catastral para seleccionarla.")
                    .assertIsDisplayed()
                true
            }.getOrDefault(false)
        }

        composeRule
            .onNodeWithTag("plot-map-view")
            .performTouchInput { click(center) }

        composeRule.waitUntil(timeoutMillis = 5_000) {
            runCatching {
                composeRule
                    .onNodeWithText("1 parcela seleccionada")
                    .assertIsDisplayed()
                true
            }.getOrDefault(false)
        }

        composeRule.onNodeWithText("Añadir parcela").performClick()
        composeRule
            .onNodeWithText("Añadir parcela desde Catastro")
            .assertIsDisplayed()

        composeRule.onNodeWithText("Buscar en Catastro").performClick()
        composeRule.waitUntil(timeoutMillis = 5_000) {
            runCatching {
                composeRule
                    .onNodeWithText("Geometría: Polygon")
                    .assertIsDisplayed()
                true
            }.getOrDefault(false)
        }

        composeRule.onNodeWithText("Guardar parcela").performClick()
        composeRule.waitUntil(timeoutMillis = 5_000) { saved }

        val stored = runBlocking {
            database.plotDao().findByCadastralReference(parcel.cadastralReference)
        }

        assertNotNull(stored)
        stored!!
        assertEquals("plot-map-e2e", stored.id)
        assertEquals(farm.id, stored.farmId)
        assertEquals(parcel.cadastralReference, stored.cadastralReference)
        assertEquals(parcel.geometryGeoJson, stored.boundaryGeoJson)
        assertEquals("catastro", stored.boundarySource)
        assertEquals("pending_upload", stored.syncState)
    }

}
