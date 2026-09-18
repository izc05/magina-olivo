package com.isivolt.maginaolivo.domain.catastro

import kotlin.math.cos

private const val METERS_PER_DEGREE_LATITUDE = 111_320.0
private const val MAX_CATASTRO_BBOX_AREA_M2 = 1_000_000.0

data class CatastroBbox(
    val minLongitude: Double,
    val minLatitude: Double,
    val maxLongitude: Double,
    val maxLatitude: Double,
) {
    fun validationError(maxAreaM2: Double = MAX_CATASTRO_BBOX_AREA_M2): String? {
        val values = listOf(minLongitude, minLatitude, maxLongitude, maxLatitude)
        if (values.any { !it.isFinite() }) return "BBOX_NON_FINITE"
        if (minLongitude < -180.0 || maxLongitude > 180.0) return "BBOX_LONGITUDE_OUT_OF_RANGE"
        if (minLatitude < -85.0 || maxLatitude > 85.0) return "BBOX_LATITUDE_OUT_OF_RANGE"
        if (minLongitude >= maxLongitude || minLatitude >= maxLatitude) return "BBOX_EMPTY_OR_INVERTED"

        val centerLatitudeRadians = Math.toRadians((minLatitude + maxLatitude) / 2.0)
        val widthMeters =
            (maxLongitude - minLongitude) * METERS_PER_DEGREE_LATITUDE * cos(centerLatitudeRadians)
        val heightMeters = (maxLatitude - minLatitude) * METERS_PER_DEGREE_LATITUDE
        val areaM2 = widthMeters * heightMeters

        if (!areaM2.isFinite()) return "BBOX_NON_FINITE"
        if (areaM2 > maxAreaM2) return "BBOX_AREA_TOO_LARGE"
        return null
    }
}
