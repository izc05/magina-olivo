package com.isivoltpro.maginaolivo

import android.content.Context
import android.graphics.Bitmap
import android.net.ConnectivityManager
import android.os.ParcelFileDescriptor
import android.view.View
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.systemBarsPadding
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableStateOf
import androidx.compose.ui.Modifier
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.test.core.app.ApplicationProvider
import androidx.test.espresso.Espresso.onView
import androidx.test.espresso.UiController
import androidx.test.espresso.ViewAction
import androidx.test.espresso.matcher.ViewMatchers.isAssignableFrom
import androidx.test.platform.app.InstrumentationRegistry
import com.isivoltpro.maginaolivo.feature.maps.*
import com.isivoltpro.maginaolivo.ui.theme.MaginaOlivoTheme
import java.io.File
import java.util.concurrent.atomic.AtomicInteger
import java.util.concurrent.atomic.AtomicReference
import org.hamcrest.Matcher
import org.junit.Assert.*
import org.junit.Assume.assumeTrue
import org.junit.Rule
import org.junit.Test
import org.maplibre.android.maps.MapLibreMap
import org.maplibre.android.maps.MapView
import org.maplibre.android.style.expressions.Expression
import org.maplibre.android.style.sources.GeoJsonSource
import org.maplibre.android.tile.TileOperation

/** Opt-in real IGN availability evidence; deterministic offline/permission gates run separately.
 * Native cache and network events are required, not inferred from a successful HTTP request.
 */
class LivePnoaOfflineRecoveryTest {
    @get:Rule val compose = createComposeRule()
    private val instrumentation = InstrumentationRegistry.getInstrumentation()
    private val context = ApplicationProvider.getApplicationContext<Context>()
    private val native = AtomicReference<MapLibreMap>()
    private val frames = AtomicInteger()
    private val cacheLoads = AtomicInteger()
    private val networkLoads = AtomicInteger()
    private val scene = mutableStateOf(0)
    private val retry = mutableStateOf(0L)
    private val output = File(context.getExternalFilesDir(null), "live-pnoa-recovery-evidence")

    @Test fun realCacheSurvivesDisconnectionAndExplicitRetryRecoversFromIgn() {
        assumeTrue("Opt in with -e live_pnoa_recovery true", InstrumentationRegistry.getArguments().getString("live_pnoa_recovery") == "true")
        assertEquals("Never switch connectivity on a physical phone automatically", "1", shell("getprop ro.kernel.qemu"))
        val airplane = shell("cmd connectivity airplane-mode")
        val wifi = shell("settings get global wifi_on")
        val bluetooth = shell("settings get global bluetooth_on")
        val geometry = """{"type":"Polygon","coordinates":[[[-3.4113,37.8227],[-3.4107,37.8227],[-3.4107,37.8233],[-3.4113,37.8233],[-3.4113,37.8227]]]}"""
        val parcel = MapParcel("pnoa-offline-synthetic", "Parcela de prueba sintética", geometry, MapParcelKind.SAVED)
        val focus = MapFocus(GeoPoint(37.823, -3.411), zoom = 17.0)
        fun restoreNetwork() {
            shell("cmd connectivity airplane-mode " + if (airplane == "enabled") "enable" else "disable")
            shell("svc wifi " + if (wifi == "1") "enable" else "disable")
            shell("cmd bluetooth_manager " + if (bluetooth == "1") "enable" else "disable")
        }
        output.mkdirs()
        File(output, "device-before.txt").writeText("airplane=" + airplane + "\nwifi=" + wifi + "\nbluetooth=" + bluetooth)
        try {
            compose.setContent {
                MaginaOlivoTheme {
                    Box(Modifier.fillMaxSize().systemBarsPadding()) {
                        key(scene.value) {
                            ParcelMap(listOf(parcel), Modifier.fillMaxSize(), base = MapBase.AERIAL,
                                focus = focus, tileRetryToken = retry.value, cadastreLines = false, sigpacLines = false)
                        }
                    }
                }
            }
            bindNative()
            waitForPhoto("warm-online")
            val cachedBefore = cacheLoads.get()
            shell("cmd connectivity airplane-mode enable")
            shell("svc wifi disable")
            compose.waitUntil(15_000) { context.getSystemService(ConnectivityManager::class.java).activeNetwork == null }
            compose.runOnIdle { native.set(null); frames.set(0); scene.value++ }
            bindNative()
            waitForPhoto("recreated-offline-cache")
            assertTrue("A recreated native MapView must actually load its warmed PNOA from cache", cacheLoads.get() > cachedBefore)
            val loadsBeforeRetry = networkLoads.get()
            restoreNetwork()
            compose.waitUntil(30_000) { context.getSystemService(ConnectivityManager::class.java).activeNetwork != null }
            compose.runOnIdle { frames.set(0); retry.value = System.nanoTime() }
            compose.waitUntil(45_000) { networkLoads.get() > loadsBeforeRetry }
            waitForPhoto("reconnected-explicit-retry")
            compose.runOnIdle {
                val ids = native.get().style?.getSourceAs<GeoJsonSource>("saved-parcels")
                    ?.querySourceFeatures(Expression.literal(true))?.map { it.getStringProperty("id") }?.toSet()
                assertEquals("Connectivity and retry do not replace local parcel identity", setOf(parcel.id), ids)
                assertEquals(17.0, native.get().cameraPosition.zoom, .000001)
                assertEquals(37.823, native.get().cameraPosition.target!!.latitude, .000001)
                assertEquals(-3.411, native.get().cameraPosition.target!!.longitude, .000001)
            }
            File(output, "native-recovery.txt").writeText("Official IGN/PNOA; synthetic camera/geometry, no Room writes.\n" +
                "Native LoadFromCache=" + cacheLoads.get() + "\nNative LoadFromNetwork=" + networkLoads.get() +
                "\nCache after MapView recreation while no network; new retry token loads from network after reconnection.\n")
        } finally {
            restoreNetwork()
            File(output, "device-after.txt").writeText("airplane=" + shell("cmd connectivity airplane-mode") +
                "\nwifi=" + shell("settings get global wifi_on") + "\nbluetooth=" + shell("settings get global bluetooth_on"))
        }
    }

    private fun bindNative() {
        onView(isAssignableFrom(MapView::class.java)).perform(object : ViewAction {
            override fun getConstraints(): Matcher<View> = isAssignableFrom(MapView::class.java)
            override fun getDescription() = "Observe official raster cache/network and complete native frames"
            override fun perform(controller: UiController, view: View) {
                (view as MapView).addOnTileActionListener { operation, _, _, _, _, _, source ->
                    if (source == "base" && operation == TileOperation.LoadFromCache) cacheLoads.incrementAndGet()
                    if (source == "base" && operation == TileOperation.LoadFromNetwork) networkLoads.incrementAndGet()
                }
                view.addOnDidFinishRenderingFrameListener { fully, _, _ -> if (fully) frames.incrementAndGet() }
                view.getMapAsync(native::set)
            }
        })
        compose.waitUntil(15_000) { native.get() != null && native.get().style != null }
    }

    private fun waitForPhoto(stage: String) {
        compose.waitUntil(45_000) {
            var positioned = false
            compose.runOnIdle { positioned = kotlin.math.abs(native.get().cameraPosition.zoom - 17.0) < .000001 }
            positioned && frames.get() > 0
        }
        val snapshot = AtomicReference<Bitmap>()
        compose.runOnIdle { native.get().snapshot(snapshot::set) }
        compose.waitUntil(15_000) { snapshot.get() != null }
        val image = snapshot.get()
        val colors = mutableSetOf<Int>()
        for (x in 1..16) for (y in 1..16) colors += image.getPixel(image.width * x / 17, image.height * y / 17)
        assertTrue("Native PNOA must contain real imagery, not a flat background plus a contour: " + stage, colors.size > 16)
        File(output, stage + "-native.png").outputStream().use { check(image.compress(Bitmap.CompressFormat.PNG, 100, it)) }
    }

    private fun shell(command: String): String = ParcelFileDescriptor.AutoCloseInputStream(instrumentation.uiAutomation.executeShellCommand(command))
        .bufferedReader().use { it.readText().trim() }
}
