package com.isivoltpro.maginaolivo.feature.maps

import com.google.gson.JsonObject
import com.google.gson.JsonParser
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder
import java.text.Normalizer
import java.util.Locale
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

data class MapPlace(val id: String, val type: String, val label: String, val point: GeoPoint? = null)

interface PlaceSearchClient {
    suspend fun candidates(query: String): List<MapPlace>
    suspend fun resolve(place: MapPlace): GeoPoint
}

/** Official CartoCiudad find responses, checked 2026-10-12, usable offline.
 * Population centres, never parcel coordinates. Source: find?id=<id>&type=poblacion.
 */
private val PILOT_MAP_PLACES = listOf(
    MapPlace("100020606", "poblacion", "Bedmar · Bedmar y Garcíez · Jaén", GeoPoint(37.82283439581455, -3.413993371316052)),
    MapPlace("100020488", "poblacion", "Jódar · Jaén", GeoPoint(37.83928993939404, -3.351965314016476)),
    MapPlace("100019266", "poblacion", "Garcíez · Bedmar y Garcíez · Jaén", GeoPoint(37.87357755276468, -3.457710565325937)),
)

internal fun normalizedPlaceName(text: String): String =
    Normalizer.normalize(text.trim(), Normalizer.Form.NFD).replace(Regex("\\p{M}+"), "").lowercase(Locale.ROOT)

fun localMapPlaces(query: String): List<MapPlace> {
    val name = normalizedPlaceName(query)
    return PILOT_MAP_PLACES.filter { normalizedPlaceName(it.label.substringBefore(" · ")).startsWith(name) }
}

/** Zero coordinates in candidates are placeholders: find resolves the selected identity. */
class OfficialPlaceSearchClient(private val fetch: suspend (String) -> String = ::fetchPlaces) : PlaceSearchClient {
    override suspend fun candidates(query: String): List<MapPlace> =
        parsePlaceCandidates(fetch("$GEOCODER/candidates?q=${encodePlaceParameter(query)}&limit=5"))

    override suspend fun resolve(place: MapPlace): GeoPoint {
        val resolved = parsePlace(JsonParser.parseString(fetch(
            "$GEOCODER/find?id=${encodePlaceParameter(place.id)}&type=${encodePlaceParameter(place.type)}",
        )).asJsonObject) ?: error("Place identity missing")
        require(resolved.id == place.id && resolved.type.equals(place.type, ignoreCase = true)) { "Place identity changed" }
        return requireNotNull(resolved.point) { "Place coordinates unresolved" }
    }
}

internal fun parsePlaceCandidates(body: String): List<MapPlace> =
    JsonParser.parseString(body).asJsonArray.mapNotNull { element ->
        if (element.isJsonObject) parsePlace(element.asJsonObject) else null
    }.distinctBy { it.id to it.type }.take(5)

private fun parsePlace(item: JsonObject): MapPlace? {
    fun text(name: String): String? = item.get(name)?.takeIf { it.isJsonPrimitive }?.asString?.takeIf { it.isNotBlank() }
    val id = text("id") ?: return null
    val type = text("type") ?: return null
    val label = text("address") ?: return null
    val latitude = text("lat")?.toDoubleOrNull()
    val longitude = text("lng")?.toDoubleOrNull()
    val point = if (latitude != null && longitude != null && latitude.isFinite() && longitude.isFinite() &&
        latitude in -90.0..90.0 && longitude in -180.0..180.0 && (latitude != 0.0 || longitude != 0.0)) {
        GeoPoint(latitude, longitude)
    } else null
    return MapPlace(id, type, label, point)
}

private const val GEOCODER = "https://www.cartociudad.es/geocoder/api/geocoder"
private fun encodePlaceParameter(value: String): String = URLEncoder.encode(value, "UTF-8")

private suspend fun fetchPlaces(url: String): String = withContext(Dispatchers.IO) {
    val connection = URL(url).openConnection() as HttpURLConnection
    try {
        connection.connectTimeout = 10_000
        connection.readTimeout = 10_000
        connection.setRequestProperty("Accept", "application/json")
        require(connection.responseCode in 200..299) { "Place service unavailable" }
        connection.inputStream.bufferedReader(Charsets.UTF_8).use { reader ->
            val response = StringBuilder()
            val buffer = CharArray(4096)
            while (true) {
                val count = reader.read(buffer)
                if (count < 0) break
                require(response.length + count <= 2 * 1024 * 1024) { "Place response too large" }
                response.append(buffer, 0, count)
            }
            response.toString()
        }
    } finally {
        connection.disconnect()
    }
}
