package com.isivoltpro.maginaolivo.feature.maps

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class MapParcelSelectionTest {
    private val outer = "[[0,0],[2,0],[2,2],[0,2],[0,0]]"
    private fun parcel(id: String, rings: String = outer) = MapParcel(id, id,
        """{"type":"Polygon","coordinates":[$rings]}""")

    @Test fun uniqueInteriorDeduplicatesTileHits() {
        assertEquals("a", uniqueParcelAtPoint(listOf(parcel("a")), listOf("a", "a"), 1.0, 1.0))
    }
    @Test fun overlapNeverChoosesFirstInEitherOrder() {
        val parcels = listOf(parcel("a"), parcel("b"))
        assertNull(uniqueParcelAtPoint(parcels, listOf("a", "b"), 1.0, 1.0))
        assertNull(uniqueParcelAtPoint(parcels.reversed(), listOf("b", "a"), 1.0, 1.0))
    }
    @Test fun edgesAndNearbyNativeHitsRemainUnselected() {
        assertNull(uniqueParcelAtPoint(listOf(parcel("a")), listOf("a"), 0.0, 1.0))
        assertNull(uniqueParcelAtPoint(listOf(parcel("a")), listOf("a"), -0.001, 1.0))
    }
    @Test fun holesAndTheirEdgesCannotSelect() {
        val withHole = parcel("a", "$outer,[[0.5,0.5],[1.5,0.5],[1.5,1.5],[0.5,1.5],[0.5,0.5]]")
        assertNull(uniqueParcelAtPoint(listOf(withHole), listOf("a"), 1.0, 1.0))
        assertNull(uniqueParcelAtPoint(listOf(withHole), listOf("a"), 0.5, 1.0))
        assertEquals("a", uniqueParcelAtPoint(listOf(withHole), listOf("a"), 0.25, 1.0))
    }
    @Test fun multipartUsesOriginalPolygonAndRequiresRenderedIdentity() {
        val multi = MapParcel("a", "A", """{"type":"MultiPolygon","coordinates":[[$outer],[[[3,0],[4,0],[4,1],[3,1],[3,0]]]]}""")
        assertEquals("a", uniqueParcelAtPoint(listOf(multi), listOf("a"), 3.5, 0.5))
        assertNull(uniqueParcelAtPoint(listOf(multi), listOf("other"), 3.5, 0.5))
    }
    @Test fun staleHitsAndMalformedOrUnclosedGeometryFailClosed() {
        assertNull(uniqueParcelAtPoint(listOf(parcel("b")), listOf("a"), 1.0, 1.0))
        for (geometry in listOf("not-json", """{"type":"Polygon","coordinates":[[[0,0],[2,0],[2,2],[0,2]]]}""",
            """{"type":"Polygon","coordinates":[$outer,[[0.5,0.5],[1.5,0.5],[1.5,1.5],[0.5,1.5]]]}""")) {
            assertNull(uniqueParcelAtPoint(listOf(MapParcel("a", "A", geometry)), listOf("a"), 1.0, 1.0))
        }
        assertNull(uniqueParcelAtPoint(listOf(parcel("a")), listOf("a"), Double.NaN, 1.0))
    }
}
