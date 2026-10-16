package com.isivoltpro.maginaolivo

import android.view.View
import android.graphics.Bitmap
import android.content.Context
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.systemBarsPadding
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.SemanticsActions
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.test.espresso.Espresso.onView
import androidx.test.espresso.UiController
import androidx.test.espresso.ViewAction
import androidx.test.espresso.matcher.ViewMatchers.isAssignableFrom
import androidx.test.core.app.ApplicationProvider
import androidx.test.platform.app.InstrumentationRegistry
import com.isivoltpro.maginaolivo.app.AppearanceMode
import com.isivoltpro.maginaolivo.domain.parcel.Parcel
import com.isivoltpro.maginaolivo.domain.parcel.ParcelSource
import com.isivoltpro.maginaolivo.feature.maps.FarmMapScreen
import com.isivoltpro.maginaolivo.feature.maps.FarmMapState
import com.isivoltpro.maginaolivo.feature.maps.GeoPoint
import com.isivoltpro.maginaolivo.feature.maps.MapFocus
import com.isivoltpro.maginaolivo.ui.theme.MaginaOlivoTheme
import com.isivoltpro.maginaolivo.ui.theme.MoSurfaceTokens
import java.util.concurrent.atomic.AtomicReference
import java.util.UUID
import java.io.File
import org.hamcrest.Matcher
import org.junit.Assert.assertEquals
import org.junit.Assert.assertSame
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.maplibre.android.maps.MapLibreMap
import org.maplibre.android.maps.MapView
import org.maplibre.android.style.layers.RasterLayer

/** Controls must affect the real native layers independently; no records are written. */
class NativeMapLayerControlsTest {
    @get:Rule val compose = createComposeRule()
    @Test fun lightLayersHaveIndependentIntensityAndOfflineControls() = verify(AppearanceMode.LIGHT)
    @Test fun darkLayersHaveIndependentIntensityAndOfflineControls() = verify(AppearanceMode.DARK)

    private fun verify(mode: AppearanceMode) {
        val map = AtomicReference<MapLibreMap>()
        val parcel = Parcel(id = UUID.randomUUID(), workspaceId = UUID.randomUUID(), farmId = UUID.randomUUID(),
            displayName = "Parcela QA sintética", cadastralReference = null, cadastralPolygon = null, cadastralParcel = null,
            municipality = null, province = null, source = ParcelSource.MANUAL,
            geometryGeoJson = """{"type":"Polygon","coordinates":[[[-3.4806,37.6354],[-3.4794,37.6354],[-3.4794,37.6366],[-3.4806,37.6366],[-3.4806,37.6354]]]}""",
            cadastralAreaM2 = null, managedAreaM2 = 9000.0, notes = null, archivedAt = null, version = 1)
        compose.setContent {
            MaginaOlivoTheme(mode) {
                Box(Modifier.fillMaxSize().background(MoSurfaceTokens.appBackground).systemBarsPadding()) {
                    FarmMapScreen(state = FarmMapState(parcels = listOf(parcel), selectedSavedId = parcel.id,
                        focus = MapFocus(GeoPoint(37.636, -3.480))),
                        onMode = {}, onSearchCoordinates = {}, onMyLocation = {},
                        onSearchPolygonParcel = { _, _, _, _ -> }, onSearchByReference = {},
                        onTapMap = { _, _ -> }, onTapParcel = {}, onImport = {}, onLink = {}, onOpenParcel = {})
                }
            }
        }
        onView(isAssignableFrom(MapView::class.java)).perform(object : ViewAction {
            override fun getConstraints(): Matcher<View> = isAssignableFrom(MapView::class.java)
            override fun getDescription() = "Read native raster layers"
            override fun perform(uiController: UiController, view: View) { (view as MapView).getMapAsync { map.set(it) } }
        })
        expectIntensity(map, 0.65f, 0.5f)
        compose.waitUntil(10_000) {
            var rendered = false
            compose.runOnIdle {
                rendered = map.get().queryRenderedFeatures(map.get().projection.toScreenLocation(org.maplibre.android.geometry.LatLng(37.636, -3.480)), "parcels-fill")
                    .any { it.getStringProperty("id") == parcel.id.toString() }
            }
            rendered
        }
        val initialStyle = AtomicReference<org.maplibre.android.maps.Style>()
        val initialCamera = AtomicReference<org.maplibre.android.camera.CameraPosition>()
        compose.waitForIdle()
        compose.runOnIdle {
            initialStyle.set(map.get().style)
            initialCamera.set(map.get().cameraPosition)
        }
        captureNative(map, mode)
        compose.onNodeWithTag("farm-map-layer").performClick()
        for (intensity in listOf(0.8f, 0.75f, 0.85f)) {
            compose.onNodeWithTag("farm-map-cadastre-intensity").performScrollTo()
                .performSemanticsAction(SemanticsActions.SetProgress) { it(intensity) }
            expectIntensity(map, intensity, 0.5f)
            compose.runOnIdle {
                assertSame("Changing intensity must not reconstruct sources", initialStyle.get(), map.get().style)
                assertEquals(initialCamera.get().target!!.latitude, map.get().cameraPosition.target!!.latitude, 0.000001)
                assertEquals(initialCamera.get().zoom, map.get().cameraPosition.zoom, 0.000001)
                assertTrue(map.get().queryRenderedFeatures(map.get().projection.toScreenLocation(org.maplibre.android.geometry.LatLng(37.636, -3.480)), "parcels-fill")
                    .any { it.getStringProperty("id") == parcel.id.toString() })
            }
        }
        compose.onNodeWithTag("farm-map-sigpac-intensity").performScrollTo()
            .performSemanticsAction(SemanticsActions.SetProgress) { it(0.4f) }
        expectIntensity(map, 0.85f, 0.4f)
        captureWindow(mode)
        compose.onNodeWithTag("farm-map-base-NONE").performScrollTo().performClick()
        compose.waitUntil(10_000) {
            var local = false
            compose.runOnIdle { local = map.get()?.style?.let { it.getSource("base") == null && it.getSource("cadastre") == null && it.getSource("sigpac") == null } == true }
            local
        }
        compose.onNodeWithTag("farm-map-layer").performClick()
        compose.onNodeWithTag("farm-map-cadastre-intensity").performScrollTo().assertIsNotEnabled()
        compose.onNodeWithTag("farm-map-sigpac-intensity").performScrollTo().assertIsNotEnabled()
        compose.onNodeWithTag("farm-map-base-AERIAL").performScrollTo().performClick()
        expectIntensity(map, 0.85f, 0.4f)
    }

    private fun evidenceFile(mode: AppearanceMode, state: String): File {
        val context = ApplicationProvider.getApplicationContext<Context>()
        val metrics = context.resources.displayMetrics
        val width = (metrics.widthPixels / metrics.density).toInt()
        val scale = context.resources.configuration.fontScale
        return File(context.getExternalFilesDir(null), "map-layer-evidence/${mode.name.lowercase()}-$state-${width}dp-font$scale.png")
            .apply { parentFile!!.mkdirs() }
    }

    private fun captureNative(map: AtomicReference<MapLibreMap>, mode: AppearanceMode) {
        val bitmap = AtomicReference<Bitmap>()
        compose.runOnIdle { map.get().snapshot { bitmap.set(it) } }
        compose.waitUntil(10_000) { bitmap.get() != null }
        evidenceFile(mode, "selected-native-frame").outputStream().use { bitmap.get().compress(Bitmap.CompressFormat.PNG, 100, it) }
    }

    private fun captureWindow(mode: AppearanceMode) {
        compose.waitForIdle()
        val bitmap = requireNotNull(InstrumentationRegistry.getInstrumentation().uiAutomation.takeScreenshot())
        evidenceFile(mode, "intensity-menu").outputStream().use { bitmap.compress(Bitmap.CompressFormat.PNG, 100, it) }
    }

    private fun expectIntensity(map: AtomicReference<MapLibreMap>, cadastre: Float, sigpac: Float) {
        compose.waitUntil(10_000) {
            var matches = false
            compose.runOnIdle {
                val style = map.get()?.style
                matches = style?.getLayerAs<RasterLayer>("cadastre")?.rasterOpacity?.value == cadastre &&
                    style?.getLayerAs<RasterLayer>("sigpac")?.rasterOpacity?.value == sigpac
            }
            matches
        }
        compose.runOnIdle {
            assertEquals(cadastre, map.get().style!!.getLayerAs<RasterLayer>("cadastre")!!.rasterOpacity.value!!, 0.0001f)
            assertEquals(sigpac, map.get().style!!.getLayerAs<RasterLayer>("sigpac")!!.rasterOpacity.value!!, 0.0001f)
        }
    }
}
