package com.isivoltpro.maginaolivo.feature.maps

import java.math.BigDecimal
import kotlin.math.floor
import kotlin.math.log10
import kotlin.math.pow

internal data class MapScaleValue(val meters: Double, val widthPx: Float, val label: String)

/** Resolve a readable metric distance against the actual projection, including nonlinear views. */
internal fun projectedMapScale(maximumWidthPx: Float, distanceAtWidth: (Float) -> Double): MapScaleValue? = runCatching {
    require(maximumWidthPx.isFinite() && maximumWidthPx > 0)
    val maximumMeters = distanceAtWidth(maximumWidthPx)
    require(maximumMeters.isFinite() && maximumMeters > 0)
    val magnitude = 10.0.pow(floor(log10(maximumMeters)))
    require(magnitude.isFinite() && magnitude > 0)
    val normalized = maximumMeters / magnitude
    val meters = magnitude * when { normalized >= 5 -> 5; normalized >= 2 -> 2; else -> 1 }
    var low = 0f
    var high = maximumWidthPx
    repeat(20) {
        val middle = (low + high) / 2
        val distance = distanceAtWidth(middle)
        require(distance.isFinite() && distance >= 0)
        if (distance < meters) low = middle else high = middle
    }
    val (number, unit) = when {
        meters >= 1000 -> meters / 1000 to "km"
        meters < 1 -> meters * 100 to "cm"
        else -> meters to "m"
    }
    val label = BigDecimal.valueOf(number).stripTrailingZeros().toPlainString().replace('.', ',') + " $unit"
    MapScaleValue(meters, (low + high) / 2, label)
}.getOrNull()
