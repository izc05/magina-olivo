package com.isivoltpro.maginaolivo

import androidx.test.platform.app.InstrumentationRegistry
import com.isivoltpro.maginaolivo.feature.maps.OfficialPlaceSearchClient
import com.isivoltpro.maginaolivo.feature.maps.localMapPlaces
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assume.assumeTrue
import org.junit.Test

/** Explicit live DEV probe. Service availability is not part of the deterministic CI suite. */
class LivePlaceProviderSmokeTest {
    @Test fun officialPilotPlacesResolveOverAndroidHttps() = runBlocking {
        assumeTrue("Opt in with -e live_place_provider true", InstrumentationRegistry.getArguments().getString("live_place_provider") == "true")
        val client = OfficialPlaceSearchClient()
        for (cached in localMapPlaces("")) {
            val choices = client.candidates(cached.label.substringBefore(" · "))
            val selected = choices.single { it.id == cached.id && it.type.equals(cached.type, ignoreCase = true) }
            val live = client.resolve(selected)
            assertEquals(cached.point!!.latitude, live.latitude, 0.00001)
            assertEquals(cached.point.longitude, live.longitude, 0.00001)
            println("CartoCiudad ${cached.id}: ${live.latitude}, ${live.longitude}")
        }
    }
}
