package com.isivoltpro.maginaolivo

import android.graphics.PointF
import android.content.Context
import android.graphics.Bitmap
import androidx.test.core.app.ApplicationProvider
import androidx.test.platform.app.InstrumentationRegistry
import java.io.File
import android.view.View
import androidx.compose.runtime.mutableStateOf
import com.isivoltpro.maginaolivo.feature.maps.MapParcel
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.systemBars
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.SemanticsProperties
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import com.isivoltpro.maginaolivo.app.AppearanceMode
import com.isivoltpro.maginaolivo.feature.maps.MapBase
import com.isivoltpro.maginaolivo.feature.maps.MapFocus
import com.isivoltpro.maginaolivo.feature.maps.GeoPoint
import com.isivoltpro.maginaolivo.feature.maps.ParcelMap
import com.isivoltpro.maginaolivo.ui.theme.MaginaOlivoTheme
import com.isivoltpro.maginaolivo.ui.theme.MoSurfaceTokens
import androidx.test.espresso.Espresso.onView
import androidx.test.espresso.UiController
import androidx.test.espresso.ViewAction
import androidx.test.espresso.matcher.ViewMatchers.isAssignableFrom
import java.util.concurrent.atomic.AtomicReference
import kotlin.math.abs
import org.hamcrest.Matcher
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.maplibre.android.camera.CameraUpdateFactory
import org.maplibre.android.geometry.LatLng
import org.maplibre.android.maps.MapLibreMap
import org.maplibre.android.maps.MapView

/** Compare the actual visible bar with the native geographic distance at its two endpoints. */
class NativeMapScaleTest {
    @get:Rule val compose = createComposeRule()
    @Test fun lightScaleTracksNativeZoomAndLatitude() = expectScale(AppearanceMode.LIGHT)
    @Test fun darkScaleTracksNativeZoomAndLatitude() = expectScale(AppearanceMode.DARK)

    private fun expectScale(mode: AppearanceMode) {
        val native = AtomicReference<MapLibreMap>()
        val selected = mutableStateOf<String?>(null)
        val parcel = MapParcel("scale-fixture", "Scale fixture", """{"type":"Polygon","coordinates":[[[-3.4806,37.6354],[-3.4794,37.6354],[-3.4794,37.6366],[-3.4806,37.6366],[-3.4806,37.6354]]]}""")
        val focus = MapFocus(GeoPoint(37.636, -3.480))
        compose.setContent {
            MaginaOlivoTheme(mode) {
                Box(Modifier.fillMaxSize().background(MoSurfaceTokens.appBackground).windowInsetsPadding(WindowInsets.systemBars)) {
                    ParcelMap(listOf(parcel), Modifier.fillMaxSize(), base = MapBase.NONE,
                        focus = focus, selectedId = selected.value)
                }
            }
        }
        compose.onNodeWithTag("map-scale").assertIsDisplayed()
        onView(isAssignableFrom(MapView::class.java)).perform(object : ViewAction {
            override fun getConstraints(): Matcher<View> = isAssignableFrom(MapView::class.java)
            override fun getDescription() = "Read native projection for scale verification"
            override fun perform(uiController: UiController, view: View) { (view as MapView).getMapAsync(native::set) }
        })
        compose.waitUntil(10_000) { native.get() != null }
        compose.waitUntil(10_000) {
            var focused = false
            compose.runOnIdle { focused = abs(native.get().cameraPosition.zoom - 16.5) < 0.000001 }
            focused
        }
        val zoomDistances = mutableListOf<Double>()
        for ((latitude, zoom) in listOf(37.636 to 15.0, 37.636 to 17.0, 37.636 to 19.0, 60.0 to 17.0)) {
            compose.runOnIdle { native.get().moveCamera(CameraUpdateFactory.newLatLngZoom(LatLng(latitude, -3.480), zoom)) }
            var matchedMeters = 0.0
            compose.waitUntil(10_000) {
                val caption = compose.onNodeWithTag("map-scale-text", useUnmergedTree = true).fetchSemanticsNode()
                    .config[SemanticsProperties.Text].single().text
                val parts = caption.trim().split(' ')
                val value = parts.firstOrNull()?.replace(',', '.')?.toDoubleOrNull()
                val meters = value?.times(when (parts.lastOrNull()) { "km" -> 1000.0; "cm" -> 0.01; "m" -> 1.0; else -> 0.0 })
                if (meters == null || meters <= 0) return@waitUntil false
                val bar = compose.onNodeWithTag("map-scale-line", useUnmergedTree = true).fetchSemanticsNode().boundsInRoot
                val map = compose.onNodeWithTag("parcel-map-view").fetchSemanticsNode().boundsInRoot
                var actual = 0.0
                var requestedPose = false
                compose.runOnIdle {
                    val camera = native.get().cameraPosition
                    requestedPose = abs(camera.zoom - zoom) < 0.000001 &&
                        camera.target?.let { abs(it.latitude - latitude) < 0.000001 } == true
                    val projection = native.get().projection
                    val left = projection.fromScreenLocation(PointF(bar.left - map.left, bar.center.y - map.top))
                    val right = projection.fromScreenLocation(PointF(bar.right - map.left, bar.center.y - map.top))
                    actual = left.distanceTo(right)
                }
                val matched = requestedPose && abs(actual - meters) / meters < 0.02
                if (matched) matchedMeters = meters
                matched
            }
            assertTrue("Scale agrees with its native projected endpoints", matchedMeters > 0)
            if (latitude == 37.636) zoomDistances += matchedMeters
            capture(mode, "latitude-$latitude-zoom-$zoom")
        }
        assertTrue("The displayed scale decreases with real zoom", zoomDistances.zipWithNext().all { (before, after) -> before > after })
        compose.runOnIdle {
            native.get().moveCamera(CameraUpdateFactory.newLatLngZoom(LatLng(37.636, -3.480), 15.0))
        }
        compose.waitUntil(10_000) {
            !compose.onNodeWithTag("map-scale").fetchSemanticsNode().config.contains(SemanticsProperties.HideFromAccessibility)
        }
        compose.runOnIdle {
            native.get().animateCamera(CameraUpdateFactory.newLatLngZoom(LatLng(37.636, -3.480), 19.0), 5_000)
        }
        compose.waitUntil(10_000) {
            var moving = false
            compose.runOnIdle { moving = native.get().cameraPosition.zoom in 15.05..18.8 }
            moving
        }
        compose.runOnIdle { selected.value = parcel.id }
        compose.waitForIdle()
        compose.runOnIdle {
            assertTrue("Selection changes while the native camera is still animating", native.get().cameraPosition.zoom in 15.05..18.95)
        }
        assertTrue("Changing parcel data must not reveal a scale during camera animation",
            compose.onNodeWithTag("map-scale").fetchSemanticsNode().config.contains(SemanticsProperties.HideFromAccessibility))
        compose.waitUntil(10_000) {
            var finished = false
            compose.runOnIdle { finished = abs(native.get().cameraPosition.zoom - 19.0) < 0.000001 }
            finished && !compose.onNodeWithTag("map-scale").fetchSemanticsNode().config.contains(SemanticsProperties.HideFromAccessibility)
        }
    }
    private fun capture(mode: AppearanceMode, pose: String) {
        compose.waitForIdle()
        val context = ApplicationProvider.getApplicationContext<Context>()
        val metrics = context.resources.displayMetrics
        val width = (metrics.widthPixels / metrics.density).toInt()
        val font = context.resources.configuration.fontScale
        val output = File(context.getExternalFilesDir(null), "map-scale-evidence/${mode.name.lowercase()}-$pose-${width}dp-font$font.png")
        output.parentFile!!.mkdirs()
        val screenshot = requireNotNull(InstrumentationRegistry.getInstrumentation().uiAutomation.takeScreenshot())
        output.outputStream().use { screenshot.compress(Bitmap.CompressFormat.PNG, 100, it) }
    }
}
