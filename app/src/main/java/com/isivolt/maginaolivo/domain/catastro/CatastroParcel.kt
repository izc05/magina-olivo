package com.isivolt.maginaolivo.domain.catastro

data class CatastroParcel(
    val featureId: String,
    val cadastralReference: String,
    val label: String?,
    val areaM2: Double?,
    val geometryGeoJson: String,
    val geometryType: GeometryType,
    val sourceCheckedAt: String?,
) {
    enum class GeometryType {
        POLYGON,
        MULTI_POLYGON,
    }
}
