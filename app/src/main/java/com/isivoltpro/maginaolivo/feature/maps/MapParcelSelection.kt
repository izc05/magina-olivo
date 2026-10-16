package com.isivoltpro.maginaolivo.feature.maps

import com.google.gson.JsonArray
import com.google.gson.JsonParser

/** Tile geometry can be clipped; verify all native hits against the current original polygons. */
internal fun uniqueParcelAtPoint(
    parcels: List<MapParcel>, renderedIds: List<String>, longitude: Double, latitude: Double,
): String? {
    val hits = renderedIds.toSet()
    return parcels.filter { it.id in hits && storedGeometryCovers(it.geometry, longitude, latitude) }
        .map { it.id }.distinct().singleOrNull()
}

private fun storedGeometryCovers(geometry: String, longitude: Double, latitude: Double): Boolean = runCatching {
    val root = JsonParser.parseString(geometry).asJsonObject
    val coordinates = root.getAsJsonArray("coordinates")
    val polygons = when (root["type"].asString) {
        "Polygon" -> listOf(selectionPolygon(coordinates))
        "MultiPolygon" -> coordinates.map { selectionPolygon(it.asJsonArray) }
        else -> return@runCatching false
    }
    polygonsCoverInterior(polygons, longitude, latitude)
}.getOrDefault(false)

private fun selectionPolygon(coordinates: JsonArray): List<List<Pair<Double, Double>>> {
    require(coordinates.size() > 0)
    return coordinates.map { element ->
        val positions = element.asJsonArray
        require(positions.size() >= 4)
        val ring = positions.map { position ->
            val values = position.asJsonArray
            require(values.size() >= 2 && values[0].asJsonPrimitive.isNumber && values[1].asJsonPrimitive.isNumber)
            val longitude = values[0].asDouble
            val latitude = values[1].asDouble
            require(longitude.isFinite() && latitude.isFinite() && longitude in -180.0..180.0 && latitude in -90.0..90.0)
            longitude to latitude
        }
        require(ring.first() == ring.last())
        ring
    }
}
