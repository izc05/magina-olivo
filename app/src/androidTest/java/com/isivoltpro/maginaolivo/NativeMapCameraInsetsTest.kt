package com.isivoltpro.maginaolivo

import android.view.View
import androidx.compose.runtime.mutableStateOf
import androidx.compose.ui.Modifier
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.test.espresso.Espresso.onView
import androidx.test.espresso.UiController
import androidx.test.espresso.ViewAction
import androidx.test.espresso.matcher.ViewMatchers.isAssignableFrom
import com.isivoltpro.maginaolivo.feature.maps.MapBase
import com.isivoltpro.maginaolivo.feature.maps.MapCameraInsets
import com.isivoltpro.maginaolivo.feature.maps.MapParcel
import com.isivoltpro.maginaolivo.feature.maps.ParcelMap
import com.isivoltpro.maginaolivo.ui.theme.MaginaOlivoTheme
import java.util.concurrent.atomic.AtomicReference
import org.hamcrest.Matcher
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.maplibre.android.camera.CameraPosition
import org.maplibre.android.camera.CameraUpdateFactory
import org.maplibre.android.geometry.LatLng
import org.maplibre.android.maps.MapLibreMap
import org.maplibre.android.maps.MapView

/** Removing an error/search overlay must not undo the farmer's manual pan and zoom. */
class NativeMapCameraInsetsTest {
    @get:Rule val compose = createComposeRule()

    @Test fun changingOverlayInsetsPreservesManualCameraWithoutAFocusRequest() {
        val insets = mutableStateOf(MapCameraInsets(topPx = 100, bottomPx = 250))
        val map = AtomicReference<MapLibreMap>()
        val geometry = """{"type":"Polygon","coordinates":[[[-3.482,37.634],[-3.478,37.634],[-3.478,37.638],[-3.482,37.638],[-3.482,37.634]]]}"""
        compose.setContent {
            MaginaOlivoTheme {
                ParcelMap(listOf(MapParcel("saved", "Parcela guardada", geometry)), Modifier.fillMaxSize(),
                    base = MapBase.NONE, cameraInsets = insets.value)
            }
        }
        onView(isAssignableFrom(MapView::class.java)).perform(object : ViewAction {
            override fun getConstraints(): Matcher<View> = isAssignableFrom(MapView::class.java)
            override fun getDescription() = "Read the real native map"
            override fun perform(uiController: UiController, view: View) {
                (view as MapView).getMapAsync { map.set(it) }
            }
        })
        compose.waitUntil(10_000) {
            var loaded = false
            compose.runOnIdle { loaded = map.get()?.style != null }
            loaded
        }
        compose.waitForIdle()
        val before = AtomicReference<CameraPosition>()
        compose.runOnIdle {
            map.get().moveCamera(CameraUpdateFactory.newLatLngZoom(LatLng(37.6365, -3.4805), 16.75))
            before.set(map.get().cameraPosition)
            insets.value = MapCameraInsets(topPx = 100, bottomPx = 0)
        }
        compose.waitForIdle()
        compose.runOnIdle {
            val after = map.get().cameraPosition
            assertEquals(before.get().target!!.latitude, after.target!!.latitude, 0.000001)
            assertEquals(before.get().target!!.longitude, after.target!!.longitude, 0.000001)
            assertEquals(before.get().zoom, after.zoom, 0.000001)
            assertTrue(map.get().queryRenderedFeatures(map.get().projection.toScreenLocation(LatLng(37.636, -3.480)), "parcels-fill")
                .any { it.getStringProperty("id") == "saved" })
        }
    }
}
