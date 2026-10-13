package com.isivoltpro.maginaolivo

import android.content.Context
import android.view.View
import android.graphics.Bitmap
import java.io.File
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.systemBars
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.ui.Modifier
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onAllNodesWithTag
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performScrollTo
import androidx.test.core.app.ApplicationProvider
import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.espresso.Espresso.onView
import androidx.test.espresso.UiController
import androidx.test.espresso.ViewAction
import androidx.test.espresso.matcher.ViewMatchers.isAssignableFrom
import com.isivoltpro.maginaolivo.domain.parcel.Parcel
import com.isivoltpro.maginaolivo.app.AppearanceMode
import com.isivoltpro.maginaolivo.domain.parcel.ParcelSource
import com.isivoltpro.maginaolivo.feature.parcels.ParcelDetailScreen
import com.isivoltpro.maginaolivo.feature.parcels.ParcelDetailUiState
import com.isivoltpro.maginaolivo.ui.theme.MaginaOlivoTheme
import com.isivoltpro.maginaolivo.ui.theme.MoSurfaceTokens
import java.util.UUID
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicReference
import org.hamcrest.Matcher
import org.junit.After
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.maplibre.android.MapLibre
import org.maplibre.android.storage.FileSource
import org.maplibre.android.geometry.LatLng
import org.maplibre.android.maps.MapLibreMap
import org.maplibre.android.maps.MapView

/** A photo failure never removes the locally stored contour from the parcel's data tab. */
class ParcelBoundaryPreviewTest {
    @get:Rule val compose = createComposeRule()
    private val context = ApplicationProvider.getApplicationContext<Context>()
    private val aerialRequested = AtomicBoolean(false)
    private val ignRequested = AtomicBoolean(false)
    private val failureId = UUID.randomUUID().toString()

    @Before fun failOnlyOfficialImagery() {
        InstrumentationRegistry.getInstrumentation().runOnMainSync {
            MapLibre.getInstance(context)
            FileSource.getInstance(context).setResourceTransform { _, url ->
                if (url.startsWith("https://www.ign.es/wmts/")) {
                    if (url.contains("/pnoa-ma?")) aerialRequested.set(true)
                    if (url.contains("/ign-base?")) ignRequested.set(true)
                    "https://127.0.0.1:1/preview/$failureId/${url.hashCode()}"
                } else url
            }
        }
    }
    @After fun restoreResourceTransform() {
        FileSource.getInstance(context).setResourceTransform { _, url -> url }
    }

    @Test fun lightParcelPreviewPreservesContourAcrossFallbackAndExpansion() = expectPreview(AppearanceMode.LIGHT)
    @Test fun darkParcelPreviewPreservesContourAcrossFallbackAndExpansion() = expectPreview(AppearanceMode.DARK)

    private fun expectPreview(mode: AppearanceMode) {
        val geometry = """{"type":"Polygon","coordinates":[[[-3.412,37.822],[-3.410,37.822],[-3.410,37.824],[-3.412,37.824],[-3.412,37.822]]]}"""
        val parcel = Parcel(id = UUID.randomUUID(), workspaceId = UUID.randomUUID(), farmId = UUID.randomUUID(),
            displayName = "Contorno de prueba", cadastralReference = null, cadastralPolygon = null,
            cadastralParcel = null, municipality = "Bedmar", province = "Jaén", source = ParcelSource.MANUAL,
            geometryGeoJson = geometry, cadastralAreaM2 = null, managedAreaM2 = 9000.0,
            notes = null, archivedAt = null, version = 1)
        compose.setContent {
            MaginaOlivoTheme(mode) {
                Box(Modifier.fillMaxSize().background(MoSurfaceTokens.appBackground).windowInsetsPadding(WindowInsets.systemBars)) {
                    ParcelDetailScreen(ParcelDetailUiState(isLoading = false, parcel = parcel), {}, {}, {})
                }
            }
        }
        compose.onNodeWithTag("parcel-tab-data").performScrollTo().performClick()
        compose.onNodeWithTag("parcel-preview-aerial").performScrollTo().assertIsDisplayed()
        compose.waitUntil(15_000) { aerialRequested.get() }
        compose.waitUntil(15_000) { compose.onAllNodesWithTag("parcel-preview-error").fetchSemanticsNodes().isNotEmpty() }
        compose.onNodeWithTag("parcel-preview-ign").performScrollTo().performClick()
        compose.waitUntil(15_000) { ignRequested.get() }
        compose.waitUntil(15_000) { compose.onAllNodesWithTag("parcel-preview-error").fetchSemanticsNodes().isNotEmpty() }
        compose.onNodeWithTag("parcel-preview-local").performScrollTo().performClick()
        compose.onNodeWithTag("parcel-preview-error").assertDoesNotExist()
        compose.onNodeWithTag("parcel-map").performScrollTo()
        val native = readNativeMap()
        waitForContour(native, parcel.id.toString())
        compose.runOnIdle { org.junit.Assert.assertNull(native.get().style!!.getSource("base")) }
        compose.onNodeWithTag("parcel-preview-expand").performScrollTo().performClick()
        compose.onNodeWithTag("parcel-preview-expanded").assertIsDisplayed()
        val expanded = readNativeMap()
        assertDialogContrast(mode)
        waitForContour(expanded, parcel.id.toString())
        assertCompleteContourAboveAttribution(expanded)
        saveWindow(mode, "expanded-local")
        var previousZoom = 0.0
        compose.runOnIdle { previousZoom = expanded.get().cameraPosition.zoom }
        compose.onNodeWithContentDescription("Acercar").performClick()
        compose.waitUntil(10_000) {
            var zoomed = false
            compose.runOnIdle { zoomed = expanded.get().cameraPosition.zoom > previousZoom + 0.5 }
            zoomed
        }
        compose.onNodeWithTag("parcel-preview-close").performClick()
        compose.onNodeWithTag("parcel-preview-expanded").assertDoesNotExist()
        compose.onNodeWithTag("parcel-preview-retry").performScrollTo().performClick()
        compose.onNodeWithTag("parcel-preview-aerial").performScrollTo().assertIsDisplayed()
        compose.waitUntil(15_000) { compose.onAllNodesWithTag("parcel-preview-error").fetchSemanticsNodes().isNotEmpty() }
        compose.onNodeWithTag("parcel-preview-local").performScrollTo().performClick()
        compose.onNodeWithTag("parcel-map").performScrollTo()
        val finalMap = readNativeMap()
        waitForContour(finalMap, parcel.id.toString())
        assertCompleteContourAboveAttribution(finalMap)
        saveWindow(mode, "inline-local")
        org.junit.Assert.assertEquals(geometry, parcel.geometryGeoJson)
    }

    private fun saveWindow(mode: AppearanceMode, state: String) {
        val metrics = context.resources.displayMetrics
        val width = (metrics.widthPixels / metrics.density).toInt()
        val font = context.resources.configuration.fontScale
        val output = File(context.getExternalFilesDir(null),
            "parcel-preview-evidence/${mode.name.lowercase()}-$state-${width}dp-font$font.png")
            .apply { parentFile!!.mkdirs() }
        val image = requireNotNull(InstrumentationRegistry.getInstrumentation().uiAutomation.takeScreenshot())
        output.outputStream().use { image.compress(Bitmap.CompressFormat.PNG, 100, it) }
    }

    private fun readNativeMap(): AtomicReference<MapLibreMap> {
        val native = AtomicReference<MapLibreMap>()
        onView(isAssignableFrom(MapView::class.java)).perform(object : ViewAction {
            override fun getConstraints(): Matcher<View> = isAssignableFrom(MapView::class.java)
            override fun getDescription() = "Inspect the actual native preview map"
            override fun perform(uiController: UiController, view: View) {
                (view as MapView).getMapAsync { native.set(it) }
            }
        })
        compose.waitUntil(10_000) { native.get() != null }
        return native
    }

    private fun waitForContour(native: AtomicReference<MapLibreMap>, id: String) {
        compose.waitUntil(10_000) {
            var found = false
            compose.runOnIdle {
                val map = native.get()
                found = map.queryRenderedFeatures(map.projection.toScreenLocation(LatLng(37.823, -3.411)), "parcels-fill")
                    .any { it.getStringProperty("id") == id }
            }
            found
        }
    }

    private fun assertCompleteContourAboveAttribution(native: AtomicReference<MapLibreMap>) {
        val bounds = compose.onNodeWithTag("parcel-map-view").fetchSemanticsNode().boundsInRoot
        val attribution = compose.onNodeWithContentDescription("Atribución del mapa").fetchSemanticsNode().boundsInRoot
        compose.runOnIdle {
            for (latitude in listOf(37.822, 37.824)) for (longitude in listOf(-3.412, -3.410)) {
                val point = native.get().projection.toScreenLocation(LatLng(latitude, longitude))
                org.junit.Assert.assertTrue("Stored contour must fit above attribution: $point, map=$bounds, credit=$attribution",
                    point.x >= 0 && point.x <= bounds.width && point.y >= 0 &&
                        point.y + bounds.top < attribution.top - 2)
            }
        }
    }

    private fun assertDialogContrast(mode: AppearanceMode) {
        if (android.os.Build.VERSION.SDK_INT < 30) return
        onView(isAssignableFrom(MapView::class.java)).perform(object : ViewAction {
            override fun getConstraints(): Matcher<View> = isAssignableFrom(MapView::class.java)
            override fun getDescription() = "Check system icon contrast in the expanded map window"
            override fun perform(uiController: UiController, view: View) {
                val flags = requireNotNull(view.windowInsetsController).systemBarsAppearance
                val darkStatusIcons = flags and android.view.WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS != 0
                val darkNavigationIcons = flags and android.view.WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS != 0
                org.junit.Assert.assertEquals("Status icon contrast must follow the expanded map theme", mode == AppearanceMode.LIGHT, darkStatusIcons)
                org.junit.Assert.assertEquals("Navigation icon contrast must follow the expanded map theme", mode == AppearanceMode.LIGHT, darkNavigationIcons)
            }
        })
    }
}
