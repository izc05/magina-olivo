package com.isivoltpro.maginaolivo

import android.content.Context
import android.graphics.Bitmap
import android.view.View
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.systemBarsPadding
import androidx.compose.ui.Modifier
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.test.core.app.ApplicationProvider
import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.espresso.Espresso.onView
import androidx.test.espresso.UiController
import androidx.test.espresso.ViewAction
import androidx.test.espresso.matcher.ViewMatchers.isAssignableFrom
import com.isivoltpro.maginaolivo.app.AppearanceMode
import com.isivoltpro.maginaolivo.feature.maps.GeoPoint
import com.isivoltpro.maginaolivo.feature.maps.MapBase
import com.isivoltpro.maginaolivo.feature.maps.MapFocus
import com.isivoltpro.maginaolivo.feature.maps.ParcelMap
import com.isivoltpro.maginaolivo.ui.theme.MaginaOlivoTheme
import com.isivoltpro.maginaolivo.ui.theme.MoSurfaceTokens
import java.io.File
import java.util.concurrent.ConcurrentLinkedQueue
import java.util.concurrent.atomic.AtomicInteger
import java.util.concurrent.atomic.AtomicReference
import kotlin.math.abs
import org.hamcrest.Matcher
import org.junit.After
import org.junit.Assert.assertSame
import org.junit.Assert.assertTrue
import org.junit.Assume.assumeTrue
import org.junit.Rule
import org.junit.Test
import org.maplibre.android.MapLibre
import org.maplibre.android.camera.CameraUpdateFactory
import org.maplibre.android.geometry.LatLng
import org.maplibre.android.maps.MapLibreMap
import org.maplibre.android.maps.MapView
import org.maplibre.android.storage.FileSource

/** Opt-in real service evidence; external imagery availability is not a deterministic CI gate. */
class LiveNativePnoaProbeTest {
    @get:Rule val compose = createComposeRule()
    private val context = ApplicationProvider.getApplicationContext<Context>()
    private var observing = false

    @After fun restoreObserver() {
        if (observing) InstrumentationRegistry.getInstrumentation().runOnMainSync {
            FileSource.getInstance(context).setResourceTransform { _, url -> url }
        }
    }

    @Test fun sameBedmarPointAtNativeZoom15_17_19() {
        assumeTrue("Opt in with -e live_pnoa true", InstrumentationRegistry.getArguments().getString("live_pnoa") == "true")
        val requests = ConcurrentLinkedQueue<String>()
        InstrumentationRegistry.getInstrumentation().runOnMainSync {
            MapLibre.getInstance(context)
            FileSource.getInstance(context).setResourceTransform { _, url ->
                if (url.startsWith("https://www.ign.es/wmts/pnoa-ma?")) requests.add(url)
                url
            }
            observing = true
        }
        val native = AtomicReference<MapLibreMap>()
        val completeFrames = AtomicInteger()
        val requestedZoom = AtomicReference<Double>()
        val point = LatLng(37.823, -3.411)
        val focus = MapFocus(GeoPoint(point.latitude, point.longitude))
        compose.setContent {
            MaginaOlivoTheme(AppearanceMode.LIGHT) {
                Box(Modifier.fillMaxSize().background(MoSurfaceTokens.appBackground).systemBarsPadding()) {
                    ParcelMap(emptyList(), Modifier.fillMaxSize(), base = MapBase.AERIAL,
                        cadastreLines = false, sigpacLines = false, focus = focus)
                }
            }
        }
        onView(isAssignableFrom(MapView::class.java)).perform(object : ViewAction {
            override fun getConstraints(): Matcher<View> = isAssignableFrom(MapView::class.java)
            override fun getDescription() = "Observe fully rendered native PNOA frames without changing URLs"
            override fun perform(uiController: UiController, view: View) {
                (view as MapView).addOnDidFinishRenderingFrameListener { fully, _, _ ->
                    val requested = requestedZoom.get()
                    val camera = native.get()?.cameraPosition
                    if (fully && requested != null && camera != null && abs(camera.zoom - requested) < 0.000001 &&
                        camera.target?.let { abs(it.latitude - point.latitude) < 0.000001 && abs(it.longitude - point.longitude) < 0.000001 } == true) {
                        completeFrames.incrementAndGet()
                    }
                }
                view.getMapAsync(native::set)
            }
        })
        compose.waitUntil(30_000) {
            var ready = false
            compose.runOnIdle { ready = native.get()?.style != null && abs(native.get().cameraPosition.zoom - 16.5) < 0.000001 }
            ready
        }
        val originalStyle = native.get().style
        val output = File(context.getExternalFilesDir(null), "live-pnoa-evidence").apply { mkdirs() }
        val notes = StringBuilder("Official PNOA, original URLs, synthetic camera point only, no Room writes.\n")
        for (zoom in listOf(15.0, 17.0, 19.0, 17.0)) {
            var before = 0
            compose.runOnIdle {
                requestedZoom.set(zoom)
                native.get().moveCamera(CameraUpdateFactory.newLatLngZoom(point, zoom))
                before = completeFrames.get()
            }
            compose.waitUntil(60_000) {
                var pose = false
                compose.runOnIdle {
                    val camera = native.get().cameraPosition
                    pose = abs(camera.zoom - zoom) < 0.000001 && camera.target?.let {
                        abs(it.latitude - point.latitude) < 0.000001 && abs(it.longitude - point.longitude) < 0.000001
                    } == true
                }
                pose && completeFrames.get() > before
            }
            val bitmap = AtomicReference<Bitmap>()
            compose.runOnIdle {
                assertSame("Zoom reuses the same native style and sources", originalStyle, native.get().style)
                native.get().snapshot { bitmap.set(it) }
            }
            compose.waitUntil(15_000) { bitmap.get() != null }
            val image = bitmap.get()
            val colors = mutableSetOf<Int>()
            for (x in 1..16) for (y in 1..16) {
                colors += image.getPixel(image.width * x / 17, image.height * y / 17)
            }
            assertTrue("Fully rendered PNOA must contain imagery rather than a uniform background", colors.size > 16)
            val suffix = if (notes.contains("zoom=$zoom")) "-return" else ""
            File(output, "bedmar-z${zoom.toInt()}$suffix-native.png").outputStream().use { image.compress(Bitmap.CompressFormat.PNG, 100, it) }
            notes.append("zoom=$zoom latitude=${point.latitude} longitude=${point.longitude} sampledColors=${colors.size} fullyRenderedFramesAtRequestedPose=${completeFrames.get()}\n")
        }
        assertTrue("The native source requests official PNOA", requests.isNotEmpty())
        notes.append("Observed native resource requests (can be served from cache; not a network-fetch count):\n")
        requests.distinct().forEach { notes.append(it).append('\n') }
        File(output, "native-pnoa.txt").writeText(notes.toString())
        println(notes)
    }
}
