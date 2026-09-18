package com.isivolt.maginaolivo.domain.catastro

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class CatastroBboxTest {
    @Test
    fun acceptsSmallValidViewport() {
        val bbox = CatastroBbox(
            minLongitude = -3.47,
            minLatitude = 37.73,
            maxLongitude = -3.44,
            maxLatitude = 37.76,
        )
        assertNull(bbox.validationError())
    }

    @Test
    fun rejectsLargeViewport() {
        val bbox = CatastroBbox(
            minLongitude = -3.60,
            minLatitude = 37.60,
            maxLongitude = -3.40,
            maxLatitude = 37.80,
        )
        assertEquals("BBOX_TOO_WIDE", bbox.validationError())
    }

    @Test
    fun rejectsInvertedViewport() {
        val bbox = CatastroBbox(
            minLongitude = -3.40,
            minLatitude = 37.80,
            maxLongitude = -3.60,
            maxLatitude = 37.60,
        )
        assertEquals("BBOX_EMPTY_OR_INVERTED", bbox.validationError())
    }
}
