package com.isivoltpro.maginaolivo.feature.maps

import kotlin.math.pow
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class MapScaleTest {
    @Test fun scaleUsesReadableMetricStepsWithoutExceedingProjectedWidth() {
        for ((maximum, expected) in listOf(1.7 to 1.0, 4.4 to 2.0, 9.9 to 5.0, 300.0 to 200.0, 999.9 to 500.0)) {
            val scale = projectedMapScale(100f) { maximum * it / 100 }!!
            assertEquals(expected, scale.meters, 0.000001)
            assertEquals(expected, maximum * scale.widthPx / 100, 0.001)
        }
    }
    @Test fun metricLabelsHandleCentimetresAndKilometres() {
        assertEquals("50 cm", projectedMapScale(100f) { 0.8 * it / 100 }!!.label)
        assertEquals("2 km", projectedMapScale(100f) { 2500.0 * it / 100 }!!.label)
    }
    @Test fun nonlinearProjectionIsSolvedRatherThanAssumedLinear() {
        val scale = projectedMapScale(100f) { it.toDouble().pow(2) * 0.025 }!!
        assertEquals(200.0, scale.meters, 0.000001)
        assertEquals(200.0, scale.widthPx.toDouble().pow(2) * 0.025, 0.001)
        assertEquals("200 m", scale.label)
    }
    @Test fun invalidMeasurementsNeverDisplayAFabricatedDistance() {
        for (width in listOf(0f, -1f, Float.NaN, Float.POSITIVE_INFINITY)) assertNull(projectedMapScale(width) { 10.0 })
        for (distance in listOf(0.0, -1.0, Double.NaN, Double.POSITIVE_INFINITY)) assertNull(projectedMapScale(100f) { distance })
        assertNull(projectedMapScale(100f) { if (it < 100) Double.NaN else 12.0 })
        assertNull(projectedMapScale(100f) { error("Projection unavailable") })
    }
    @Test fun aNewProjectionProducesItsOwnDistance() {
        assertEquals("100 m", projectedMapScale(100f) { it.toDouble() }!!.label)
        assertEquals("50 m", projectedMapScale(100f) { it.toDouble() / 2 }!!.label)
    }
}
