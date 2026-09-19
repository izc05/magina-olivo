package com.isivolt.maginaolivo.ui.home

import com.isivolt.maginaolivo.data.repository.WeatherRepository
import com.isivolt.maginaolivo.domain.weather.WeatherFreshnessStatus
import java.util.Locale

class WeatherRepositoryHomeSummarySource(
    private val repository: WeatherRepository,
    private val municipalityCode: () -> String,
) : HomeWeatherSummarySource {

    override suspend fun loadSummary(): Result<HomeWeatherSummary> =
        repository.loadForecast(municipalityCode()).map { loaded ->
            val forecast = loaded.forecast
            val today = forecast.days.firstOrNull()

            HomeWeatherSummary(
                municipalityName = forecast.municipality.name,
                skyDescription = today?.skyDescription,
                temperatureMinC = today?.temperatureMinC,
                temperatureMaxC = today?.temperatureMaxC,
                precipitationProbabilityPercent = today?.precipitationProbabilityPercent,
                providerLabel = forecast.attribution,
                freshnessLabel = if (loaded.degraded) {
                    "Última predicción guardada"
                } else {
                    freshnessLabel(
                        status = forecast.freshnessStatus,
                        ageHours = forecast.freshnessAgeHours,
                    )
                },
                degraded = loaded.degraded,
            )
        }

    private fun freshnessLabel(
        status: WeatherFreshnessStatus,
        ageHours: Double?,
    ): String {
        val age = ageHours?.let { " · ${formatHours(it)} h" }.orEmpty()
        return when (status) {
            WeatherFreshnessStatus.FRESH -> "Actualizado$age"
            WeatherFreshnessStatus.AGING -> "Pendiente de actualización$age"
            WeatherFreshnessStatus.STALE -> "Predicción antigua$age"
            WeatherFreshnessStatus.UNKNOWN -> "Hora no disponible"
        }
    }

    private fun formatHours(value: Double): String =
        if (value % 1.0 == 0.0) {
            value.toInt().toString()
        } else {
            String.format(Locale("es", "ES"), "%.1f", value)
        }
}
