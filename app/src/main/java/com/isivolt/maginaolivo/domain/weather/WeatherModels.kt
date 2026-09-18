package com.isivolt.maginaolivo.domain.weather

import kotlinx.serialization.Serializable

@Serializable
enum class WeatherFreshnessStatus {
    FRESH,
    AGING,
    STALE,
    UNKNOWN,
}

@Serializable
enum class WeatherDeliveryMode {
    LIVE,
    CACHE,
    DEGRADED_CACHE,
}

@Serializable
data class WeatherMunicipality(
    val code: String,
    val name: String,
    val province: String,
)

object MaginaWeatherMunicipalities {
    val all: List<WeatherMunicipality> = listOf(
        WeatherMunicipality(code = "23902", name = "Bedmar y Garcíez", province = "Jaén"),
        WeatherMunicipality(code = "23053", name = "Jódar", province = "Jaén"),
        WeatherMunicipality(code = "23052", name = "Jimena", province = "Jaén"),
        WeatherMunicipality(code = "23001", name = "Albanchez de Mágina", province = "Jaén"),
    )

    val default: WeatherMunicipality = all.first()

    fun find(code: String): WeatherMunicipality? =
        all.firstOrNull { it.code == code }
}

@Serializable
data class WeatherDay(
    val date: String,
    val skyDescription: String? = null,
    val precipitationProbabilityPercent: Int? = null,
    val temperatureMinC: Double? = null,
    val temperatureMaxC: Double? = null,
    val windMaxKmh: Double? = null,
    val uvMax: Int? = null,
)

@Serializable
data class WeatherForecast(
    val municipality: WeatherMunicipality,
    val provider: String,
    val elaboratedAt: String? = null,
    val days: List<WeatherDay> = emptyList(),
    val freshnessStatus: WeatherFreshnessStatus = WeatherFreshnessStatus.UNKNOWN,
    val freshnessAgeHours: Double? = null,
    val deliveryMode: WeatherDeliveryMode = WeatherDeliveryMode.LIVE,
    val attribution: String = "AEMET",
    val scopeNote: String? = null,
    val savedAtEpochMs: Long? = null,
)

interface WeatherGateway {
    suspend fun getForecast(municipalityCode: String): Result<WeatherForecast>
}
