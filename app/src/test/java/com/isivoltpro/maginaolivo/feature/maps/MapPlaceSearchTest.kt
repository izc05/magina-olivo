package com.isivoltpro.maginaolivo.feature.maps

import kotlinx.coroutines.test.runTest
import org.junit.Assert.*
import org.junit.Test

class MapPlaceSearchTest {
    @Test fun pilotSuggestionsMatchCaseAndAccentsAndKeepTheirMunicipality() {
        val bedmar = localMapPlaces(" BEDMAR ").single()
        assertEquals("100020606", bedmar.id)
        assertEquals(37.82283439581455, bedmar.point!!.latitude, 0.0000001)
        assertEquals("100020488", localMapPlaces("jodar").single().id)
        assertTrue(localMapPlaces("garciez").single().label.contains("Bedmar y Garcíez"))
        assertTrue(localMapPlaces("No existe este pueblo").isEmpty())
    }

    @Test fun candidatePlaceholderCoordinatesAreNotAResolvedPoint() {
        val candidates = parsePlaceCandidates("""[{"id":"23902","type":"Municipio","address":"Bedmar y Garcíez, Jaén","lat":0.0,"lng":0.0}]""")
        assertEquals(1, candidates.size)
        assertNull(candidates.single().point)
    }

    @Test fun incompleteCandidateDoesNotInventAnIdentityOrLabel() {
        assertTrue(parsePlaceCandidates("""[{"id":"","type":"poblacion","address":"Unknown"},{"id":"1","type":"poblacion","address":null}]""").isEmpty())
    }

    @Test fun resolutionUsesTheSelectedOfficialIdAndType() = runTest {
        var requested = ""
        val client = OfficialPlaceSearchClient { url ->
            requested = url
            """{"id":"100020488","type":"poblacion","address":"Jódar","lat":37.83928993939404,"lng":-3.351965314016476}"""
        }
        val point = client.resolve(MapPlace("100020488", "poblacion", "Jódar"))
        assertTrue(requested.contains("id=100020488"))
        assertTrue(requested.contains("type=poblacion"))
        assertEquals(37.83928993939404, point.latitude, 0.0000001)
        assertEquals(-3.351965314016476, point.longitude, 0.0000001)
    }

    @Test fun resolutionRejectsAnotherIdentityAndMissingCoordinates() = runTest {
        for (body in listOf(
            """{"id":"other","type":"poblacion","address":"Other","lat":37.8,"lng":-3.4}""",
            """{"id":"1","type":"poblacion","address":"Unresolved","lat":0,"lng":0}""",
            """{"id":"1","type":"poblacion","address":"Invalid","lat":137.8,"lng":-3.4}""",
        )) {
            val client = OfficialPlaceSearchClient { body }
            assertTrue(runCatching { client.resolve(MapPlace("1", "poblacion", "Selected place")) }.isFailure)
        }
    }
}
