package com.isivoltpro.maginaolivo

import android.view.View
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.mutableStateOf
import androidx.compose.ui.Modifier
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.test.espresso.Espresso.onView
import androidx.test.espresso.UiController
import androidx.test.espresso.ViewAction
import androidx.test.espresso.action.GeneralClickAction
import androidx.test.espresso.action.Press
import androidx.test.espresso.action.Tap
import androidx.test.espresso.matcher.ViewMatchers.isAssignableFrom
import com.isivoltpro.maginaolivo.feature.maps.MapBase
import com.isivoltpro.maginaolivo.feature.maps.MapParcel
import com.isivoltpro.maginaolivo.feature.maps.ParcelMap
import com.isivoltpro.maginaolivo.ui.theme.MaginaOlivoTheme
import java.util.concurrent.atomic.AtomicReference
import org.hamcrest.Matcher
import org.junit.Assert.assertNull
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test
import org.maplibre.android.geometry.LatLng
import org.maplibre.android.maps.MapLibreMap
import org.maplibre.android.maps.MapView

/** The actual native click path must not arbitrarily choose an overlapping saved parcel. */
class NativeMapParcelSelectionTest {
    @get:Rule val compose = createComposeRule()

    @Test fun overlappingSavedParcelsLeaveTheTapUnselected() {
        val selected = AtomicReference<String>()
        val inspected = AtomicReference<LatLng>()
        val map = AtomicReference<MapLibreMap>()
        val geometry = """{"type":"Polygon","coordinates":[[[-3.482,37.634],[-3.478,37.634],[-3.478,37.638],[-3.482,37.638],[-3.482,37.634]]]}"""
        val parcels = mutableStateOf(listOf(MapParcel("a", "A", geometry), MapParcel("b", "B", geometry)))
        compose.setContent {
            MaginaOlivoTheme {
                ParcelMap(parcels.value,
                    Modifier.fillMaxSize(), base = MapBase.NONE,
                    onSelected = selected::set,
                    onTap = { latitude, longitude -> inspected.set(LatLng(latitude, longitude)) })
            }
        }
        onView(isAssignableFrom(MapView::class.java)).perform(object : ViewAction {
            override fun getConstraints(): Matcher<View> = isAssignableFrom(MapView::class.java)
            override fun getDescription() = "Read native map before tapping overlapping polygons"
            override fun perform(uiController: UiController, view: View) {
                (view as MapView).getMapAsync { map.set(it) }
            }
        })
        val centre = LatLng(37.636, -3.480)
        compose.waitUntil(10_000) {
            var rendered = false
            compose.runOnIdle {
                val native = map.get()
                rendered = native?.queryRenderedFeatures(native.projection.toScreenLocation(centre), "parcels-fill")
                    ?.map { it.getStringProperty("id") }?.toSet() == setOf("a", "b")
            }
            rendered
        }
        fun tapCentre() = onView(isAssignableFrom(MapView::class.java)).perform(GeneralClickAction(Tap.SINGLE, { view ->
            val position = map.get().projection.toScreenLocation(centre)
            val origin = IntArray(2).also(view::getLocationOnScreen)
            floatArrayOf(origin[0] + position.x, origin[1] + position.y)
        }, Press.FINGER))
        tapCentre()
        compose.waitUntil(10_000) { selected.get() != null || inspected.get() != null }
        assertNull("An overlap cannot identify a unique parcel", selected.get())
        assertNotNull("Ambiguous taps remain available for verified inspection", inspected.get())
        compose.runOnIdle { parcels.value = listOf(MapParcel("c", "New current parcel", geometry)) }
        compose.waitUntil(10_000) {
            var rendered = false
            compose.runOnIdle {
                val native = map.get()
                rendered = native.queryRenderedFeatures(native.projection.toScreenLocation(centre), "parcels-fill")
                    .map { it.getStringProperty("id") }.toSet() == setOf("c")
            }
            rendered
        }
        inspected.set(null)
        tapCentre()
        compose.waitUntil(10_000) { selected.get() != null || inspected.get() != null }
        assertEquals("The listener must use current parcels after recomposition", "c", selected.get())
        assertNull("A unique interior uses the existing selection callback", inspected.get())
    }
}
