package com.isivolt.maginaolivo.ui.home

import com.isivolt.maginaolivo.data.repository.WeatherRepository
import com.isivolt.maginaolivo.domain.weather.RainAlertSettings
import com.isivolt.maginaolivo.domain.weather.WeatherPlanningAlert
import com.isivolt.maginaolivo.domain.weather.WeatherPlanningAlertEngine
import com.isivolt.maginaolivo.domain.weather.WeatherPlanningAlertKind
import com.isivolt.maginaolivo.domain.weather.WeatherPlanningAlertLevel
import java.util.Locale

class WeatherRepositoryHomeAlertSummarySource(
    private val repository: WeatherRepository,
    private val settingsProvider: () -> RainAlertSettings,
) : HomeWeatherAlertSummarySource {

    override suspend fun loadSummary(): Result<HomeWeatherAlertSummary> {
        val settings = settingsProvider()
        return repository.loadForecast(settings.municipalityCode).map { loaded ->
            val alerts = WeatherPlanningAlertEngine.evaluate(
                forecast = loaded.forecast,
                settings = settings,
            )
            val primary = WeatherPlanningAlertEngine.primary(alerts)

            HomeWeatherAlertSummary(
                totalCount = alerts.size,
                highCount = alerts.count { it.level == WeatherPlanningAlertLevel.HIGH },
                primaryTitle = primary?.let(::titleFor),
                primaryDetail = primary?.let(::detailFor),
                horizonDays = settings.horizonDays,
                degraded = loaded.degraded,
            )
        }
    }

    private fun titleFor(alert: WeatherPlanningAlert): String =
        when (alert.kind) {
            WeatherPlanningAlertKind.RAIN -> "Lluvia"
            WeatherPlanningAlertKind.WIND -> "Viento"
            WeatherPlanningAlertKind.FROST -> "Helada"
        }

    private fun detailFor(alert: WeatherPlanningAlert): String {
        val value = if (alert.value % 1.0 == 0.0) {
            alert.value.toInt().toString()
        } else {
            String.format(Locale("es", "ES"), "%.1f", alert.value)
        }
        return "${titleFor(alert)} ${value}${alert.unit} · ${alert.date}"
    }
}
