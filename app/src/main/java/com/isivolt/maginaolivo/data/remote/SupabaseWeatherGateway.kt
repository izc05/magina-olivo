package com.isivolt.maginaolivo.data.remote

import com.isivolt.maginaolivo.domain.weather.WeatherDay
import com.isivolt.maginaolivo.domain.weather.WeatherDeliveryMode
import com.isivolt.maginaolivo.domain.weather.WeatherForecast
import com.isivolt.maginaolivo.domain.weather.WeatherFreshnessStatus
import com.isivolt.maginaolivo.domain.weather.WeatherGateway
import com.isivolt.maginaolivo.domain.weather.WeatherMunicipality
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.auth.auth
import io.github.jan.supabase.functions.functions
import io.ktor.client.call.body
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

class SupabaseWeatherGateway(
    private val client: SupabaseClient,
) : WeatherGateway {

    override suspend fun getForecast(
        municipalityCode: String,
    ): Result<WeatherForecast> = runCatching {
        if (client.auth.currentSessionOrNull() == null) {
            client.auth.signInAnonymously()
        }

        val response = client.functions.invoke(
            function = "weather-forecast",
            body = buildJsonObject {
                put("municipalityCode", municipalityCode)
            },
        )

        response.body<WeatherFunctionResponse>().toDomain()
    }
}

@Serializable
private data class WeatherFunctionResponse(
    val municipality: WeatherMunicipalityDto,
    val forecast: WeatherForecastDto,
    val freshness: WeatherFreshnessDto = WeatherFreshnessDto(),
    val availability: WeatherAvailabilityDto = WeatherAvailabilityDto(),
    val source: WeatherSourceDto = WeatherSourceDto(),
)

@Serializable
private data class WeatherMunicipalityDto(
    val code: String,
    val name: String,
    val province: String,
)

@Serializable
private data class WeatherForecastDto(
    val provider: String = "AEMET OpenData",
    val elaboratedAt: String? = null,
    val days: List<WeatherDayDto> = emptyList(),
)

@Serializable
private data class WeatherDayDto(
    val date: String,
    val skyDescription: String? = null,
    val precipitationProbabilityPercent: Int? = null,
    val temperatureMinC: Double? = null,
    val temperatureMaxC: Double? = null,
    val windMaxKmh: Double? = null,
    val uvMax: Int? = null,
)

@Serializable
private data class WeatherFreshnessDto(
    val status: String = "unknown",
    val ageHours: Double? = null,
)

@Serializable
private data class WeatherAvailabilityDto(
    val mode: String = "live",
)

@Serializable
private data class WeatherSourceDto(
    val attribution: String = "AEMET",
    val scopeNote: String? = null,
)

private fun WeatherFunctionResponse.toDomain(): WeatherForecast =
    WeatherForecast(
        municipality = WeatherMunicipality(
            code = municipality.code,
            name = municipality.name,
            province = municipality.province,
        ),
        provider = forecast.provider,
        elaboratedAt = forecast.elaboratedAt,
        days = forecast.days.map { day ->
            WeatherDay(
                date = day.date,
                skyDescription = day.skyDescription,
                precipitationProbabilityPercent = day.precipitationProbabilityPercent,
                temperatureMinC = day.temperatureMinC,
                temperatureMaxC = day.temperatureMaxC,
                windMaxKmh = day.windMaxKmh,
                uvMax = day.uvMax,
            )
        },
        freshnessStatus = when (freshness.status.lowercase()) {
            "fresh" -> WeatherFreshnessStatus.FRESH
            "aging" -> WeatherFreshnessStatus.AGING
            "stale" -> WeatherFreshnessStatus.STALE
            else -> WeatherFreshnessStatus.UNKNOWN
        },
        freshnessAgeHours = freshness.ageHours,
        deliveryMode = when (availability.mode.lowercase()) {
            "cache" -> WeatherDeliveryMode.CACHE
            "degraded-cache" -> WeatherDeliveryMode.DEGRADED_CACHE
            else -> WeatherDeliveryMode.LIVE
        },
        attribution = source.attribution,
        scopeNote = source.scopeNote,
    )
