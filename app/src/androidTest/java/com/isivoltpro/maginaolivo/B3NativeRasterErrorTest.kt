package com.isivoltpro.maginaolivo

import android.content.Context
import android.graphics.Bitmap
import android.view.View
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onAllNodesWithTag
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.performClick
import androidx.test.core.app.ApplicationProvider
import androidx.test.espresso.Espresso.onView
import androidx.test.espresso.UiController
import androidx.test.espresso.ViewAction
import androidx.test.espresso.matcher.ViewMatchers.isAssignableFrom
import androidx.test.platform.app.InstrumentationRegistry
import com.isivoltpro.maginaolivo.app.AppearanceMode
import com.isivoltpro.maginaolivo.domain.parcel.Parcel
import com.isivoltpro.maginaolivo.domain.parcel.ParcelSource
import com.isivoltpro.maginaolivo.feature.maps.FarmMapScreen
import com.isivoltpro.maginaolivo.feature.maps.FarmMapState
import com.isivoltpro.maginaolivo.ui.theme.MaginaOlivoTheme
import java.io.File
import java.util.UUID
import java.util.concurrent.atomic.AtomicReference
import org.hamcrest.Matcher
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.maplibre.android.MapLibre
import org.maplibre.android.camera.CameraUpdateFactory
import org.maplibre.android.geometry.LatLng
import org.maplibre.android.maps.MapLibreMap
import org.maplibre.android.maps.MapView
import org.maplibre.android.storage.FileSource
import org.maplibre.android.tile.TileOperation

private const val IGN_WMTS = "https://www.ign.es/wmts/"

/** Native failure, native saved feature and explicit fallback; no Room/user records are changed. */
class B3NativeRasterErrorTest {
    @get:Rule val compose = createComposeRule()
    private val context = ApplicationProvider.getApplicationContext<Context>()
    private var observedView: MapView? = null
    private val baseTileRequested = java.util.concurrent.atomic.AtomicBoolean(false)
    private var observer: MapView.OnTileActionListener? = null
    private val failureRequestId = UUID.randomUUID().toString()

    /**
     * #741 — the base layer is whichever IGN WMTS the screen opened on, and since #711 B3 that is
     * the PNOA photo (`pnoa-ma`), not the street map (`ign-base`). Forcing only `ign-base` to fail
     * left the real base tiles loading normally, so no `TileOperation.Error` ever arrived and the
     * wait below timed out: the test had stopped exercising the failure it is named after.
     *
     * Every IGN WMTS request is sent to a closed local TLS port instead, so the base layer fails
     * natively whichever one the screen chose, while Catastro and SIGPAC (other hosts) are left
     * alone — this test asserts about `source == "base"` only.
     */
    @Before fun failOnlyIgnRequests() {
        InstrumentationRegistry.getInstrumentation().runOnMainSync {
            MapLibre.getInstance(context)
            FileSource.getInstance(context).setResourceTransform { _, url ->
                if (url.startsWith(IGN_WMTS)) {
                    baseTileRequested.set(true)
                    // Closed local TLS port produces a real native connection failure, independent of IGN.
                    "https://127.0.0.1:1/b3-unavailable/$failureRequestId/${url.hashCode()}"
                } else url
            }
        }
    }

    @After fun restoreNativeProcessState() {
        baseTileRequested.set(false)
        InstrumentationRegistry.getInstrumentation().runOnMainSync {
            observer?.let { observedView?.removeOnTileActionListener(it) }
        }
        FileSource.getInstance(context).setResourceTransform { _, url -> url }
    }

    @Test fun lightRasterFailureLeavesTheSavedParcelUsable() = expectSafeFallback(AppearanceMode.LIGHT)
    @Test fun darkRasterFailureLeavesTheSavedParcelUsable() = expectSafeFallback(AppearanceMode.DARK)

    private fun expectSafeFallback(mode: AppearanceMode) {
        val parcel = Parcel(
            id = UUID.fromString("71100000-0000-0000-0000-000000000003"),
            workspaceId = UUID.randomUUID(), farmId = UUID.randomUUID(), displayName = "Parcela conservada",
            cadastralReference = null, cadastralPolygon = null, cadastralParcel = null,
            municipality = null, province = null, source = ParcelSource.MANUAL,
            geometryGeoJson = GEOMETRY, cadastralAreaM2 = null, managedAreaM2 = 9000.0,
            notes = null, archivedAt = null, version = 1,
        )
        val nativeError = AtomicReference<String>()
        val nativeMap = AtomicReference<MapLibreMap>()
        compose.setContent {
            MaginaOlivoTheme(mode) {
                FarmMapScreen(
                    state = FarmMapState(parcels = listOf(parcel)),
                    onMode = {}, onSearchCoordinates = {}, onMyLocation = {},
                    onSearchPolygonParcel = { _, _, _, _ -> }, onSearchByReference = {},
                    onTapMap = { _, _ -> }, onTapParcel = {}, onImport = {},
                    onLink = {}, onOpenParcel = {},
                )
            }
        }
        onView(isAssignableFrom(MapView::class.java)).perform(object : ViewAction {
            override fun getConstraints(): Matcher<View> = isAssignableFrom(MapView::class.java)
            override fun getDescription() = "Observe actual MapLibre tile errors and rendered saved geometry"
            override fun perform(uiController: UiController, view: View) {
                val mapView = view as MapView
                observedView = mapView
                observer = MapView.OnTileActionListener { operation, _, _, _, _, _, source ->
                    if (operation == TileOperation.Error && source == "base") nativeError.set(source)
                }.also(mapView::addOnTileActionListener)
                mapView.getMapAsync { map ->
                    nativeMap.set(map)
                }
            }
        })
        // Map readiness precedes style/data readiness. Let the screen finish its first
        // framing before requesting z18, so that framing cannot replace this request.
        assertSavedGeometry(nativeMap, parcel.id.toString())
        compose.runOnIdle { nativeMap.get().moveCamera(CameraUpdateFactory.newLatLngZoom(CENTRE, 18.0)) }
        compose.waitUntil(10_000) {
            var requestedCamera = false
            compose.runOnIdle { requestedCamera = kotlin.math.abs(nativeMap.get().cameraPosition.zoom - 18.0) < 0.000001 }
            requestedCamera
        }
        // A timeout here used to read as a slow emulator; it is said plainly when the cause is that
        // the screen never asked for a remote base tile, so the drift above cannot return silently.
        try {
            compose.waitUntil(15_000) { nativeError.get() == "base" }
        } catch (timeout: androidx.compose.ui.test.ComposeTimeoutException) {
            assertTrue(
                "The map never requested an IGN base tile: this test is no longer forcing the layer the screen uses",
                baseTileRequested.get(),
            )
            throw timeout
        }
        // Baseline RED must be this assertion, after actual TileOperation.Error was observed.
        // Tile listeners run before ParcelMap posts the error into Compose state.
        compose.waitUntil(15_000) { compose.onAllNodesWithTag("farm-map-tile-error").fetchSemanticsNodes().isNotEmpty() }
        compose.onNodeWithTag("farm-map-tile-error").assertIsDisplayed()
        assertSavedGeometry(nativeMap, parcel.id.toString())
        compose.waitForIdle()
        saveWindow("b3-${mode.name.lowercase()}-native-error")
        val previousStyle = AtomicReference<org.maplibre.android.maps.Style>()
        val previousCamera = AtomicReference<org.maplibre.android.camera.CameraPosition>()
        compose.runOnIdle {
            previousStyle.set(nativeMap.get().style)
            previousCamera.set(nativeMap.get().cameraPosition)
        }
        nativeError.set(null)
        compose.onNodeWithTag("farm-map-tile-retry").assertIsDisplayed().performClick()
        compose.waitUntil(15_000) {
            var reloaded = false
            compose.runOnIdle { reloaded = nativeMap.get()?.style?.let { it !== previousStyle.get() } == true }
            nativeError.get() == "base" && reloaded
        }
        // Tile listeners run before ParcelMap posts the error into Compose state.
        compose.waitUntil(15_000) { compose.onAllNodesWithTag("farm-map-tile-error").fetchSemanticsNodes().isNotEmpty() }
        compose.onNodeWithTag("farm-map-tile-error").assertIsDisplayed()
        assertSavedGeometry(nativeMap, parcel.id.toString())
        compose.runOnIdle {
            assertEquals(previousCamera.get().target!!.latitude, nativeMap.get().cameraPosition.target!!.latitude, 0.000001)
            assertEquals(previousCamera.get().target!!.longitude, nativeMap.get().cameraPosition.target!!.longitude, 0.000001)
            assertEquals(previousCamera.get().zoom, nativeMap.get().cameraPosition.zoom, 0.000001)
        }
        compose.onNodeWithTag("farm-map-offline-fallback").assertIsDisplayed().performClick()
        compose.waitUntil(10_000) {
            var localOnly = false
            compose.runOnIdle { localOnly = nativeMap.get()?.style?.let { it.getSource("base") == null } == true }
            localOnly
        }
        compose.onNodeWithTag("farm-map-tile-error").assertDoesNotExist()
        assertSavedGeometry(nativeMap, parcel.id.toString())
        assertEquals(GEOMETRY, parcel.geometryGeoJson)
        saveWindow("b3-${mode.name.lowercase()}-native-fallback")
    }

    private fun assertSavedGeometry(reference: AtomicReference<MapLibreMap>, id: String) {
        var found = false
        compose.waitUntil(10_000) {
            compose.runOnIdle {
                val map = reference.get()
                found = map != null && map.queryRenderedFeatures(map.projection.toScreenLocation(CENTRE), "parcels-fill")
                    .any { it.getStringProperty("id") == id }
            }
            found
        }
        assertTrue("Native saved parcel remains rendered and hit-testable", found)
    }

    private fun saveWindow(name: String) {
        val output = File(context.filesDir, "b3-maps-evidence/$name.png").apply { parentFile!!.mkdirs() }
        val image = requireNotNull(InstrumentationRegistry.getInstrumentation().uiAutomation.takeScreenshot())
        output.outputStream().use { image.compress(Bitmap.CompressFormat.PNG, 100, it) }
    }

    companion object {
        // Separate synthetic footprint: successful scale/preview/live probes warm the
        // Huelma tiles. Reusing those images can avoid a native request altogether.
        // No cache or application data is cleared to force this failure fixture.
        private val CENTRE = LatLng(37.706, -3.580)
        private const val GEOMETRY = """{"type":"Polygon","coordinates":[[[-3.582,37.704],[-3.578,37.704],[-3.578,37.708],[-3.582,37.708],[-3.582,37.704]]]}"""
    }
}
