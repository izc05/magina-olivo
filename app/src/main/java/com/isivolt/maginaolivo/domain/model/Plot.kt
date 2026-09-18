package com.isivolt.maginaolivo.domain.model

enum class BoundarySource {
    CATASTRO,
    SIGPAC,
    MANUAL_MAP,
    MANUAL_GPS,
    IMPORTED,
}

data class Plot(
    val id: String,
    val farmId: String,
    val name: String,
    val cadastralReference: String? = null,
    val areaHa: Double? = null,
    val boundaryGeoJson: String? = null,
    val boundarySource: BoundarySource? = null,
)
