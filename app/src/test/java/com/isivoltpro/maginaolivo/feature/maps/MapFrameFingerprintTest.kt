package com.isivoltpro.maginaolivo.feature.maps

import org.junit.Assert.*
import org.junit.Test

class MapFrameFingerprintTest {
    private val parcel = MapParcel("a", "Alias", "Geometry", MapParcelKind.SAVED)

    @Test fun candidateAndLabelChangesDoNotReframeSavedParcels() {
        val initial = savedParcelFrameFingerprint(listOf(parcel))
        assertEquals(initial, savedParcelFrameFingerprint(listOf(parcel.copy(label = "Another alias"), parcel.copy(id = "candidate", kind = MapParcelKind.CANDIDATE))))
    }

    @Test fun anotherIdentityOrGeometryRequiresANewFrame() {
        val initial = savedParcelFrameFingerprint(listOf(parcel))
        assertNotEquals(initial, savedParcelFrameFingerprint(listOf(parcel.copy(id = "b"))))
        assertNotEquals(initial, savedParcelFrameFingerprint(listOf(parcel.copy(geometry = "Other geometry"))))
    }

    @Test fun fieldBoundariesCannotProduceTheSameConcatenatedKey() {
        assertNotEquals(savedParcelFrameFingerprint(listOf(parcel.copy(id = "ab", geometry = "c"))),
            savedParcelFrameFingerprint(listOf(parcel.copy(id = "a", geometry = "bc"))))
    }

    @Test fun largeGeometryNeverExpandsTheActivityRestorationKey() {
        val key = savedParcelFrameFingerprint(listOf(parcel.copy(geometry = "coordinate".repeat(200_000))))
        assertEquals(64, key.length)
        assertTrue(key.matches(Regex("[0-9a-f]{64}")))
    }
}
