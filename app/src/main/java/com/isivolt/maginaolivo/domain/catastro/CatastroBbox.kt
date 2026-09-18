package com.isivolt.maginaolivo.domain.catastro

data class CatastroBbox(
    val minLongitude: Double,
    val minLatitude: Double,
    val maxLongitude: Double,
    val maxLatitude: Double,
) {
    fun validationError(maxSpanDegrees: Double = 0.05): String? {
        val values = listOf(minLongitude, minLatitude, maxLongitude, maxLatitude)
        if (values.any { !it.isFinite() }) return "BBOX_NON_FINITE"
        if (minLongitude < -180.0 || maxLongitude > 180.0) return "BBOX_LONGITUDE_OUT_OF_RANGE"
        if (minLatitude < -85.0 || maxLatitude > 85.0) return "BBOX_LATITUDE_OUT_OF_RANGE"
        if (minLongitude >= maxLongitude || minLatitude >= maxLatitude) return "BBOX_EMPTY_OR_INVERTED"
        if (maxLongitude - minLongitude > maxSpanDegrees) return "BBOX_TOO_WIDE"
        if (maxLatitude - minLatitude > maxSpanDegrees) return "BBOX_TOO_TALL"
        return null
    }
}
