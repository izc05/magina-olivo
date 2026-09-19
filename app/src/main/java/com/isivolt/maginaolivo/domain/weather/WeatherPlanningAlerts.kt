package com.isivolt.maginaolivo.domain.weather

enum class WeatherPlanningAlertKind {
    RAIN,
    WIND,
    FROST,
}

enum class WeatherPlanningAlertLevel {
    NOTICE,
    HIGH,
}

data class WeatherPlanningAlert(
    val kind: WeatherPlanningAlertKind,
    val date: String,
    val level: WeatherPlanningAlertLevel,
    val municipality: WeatherMunicipality,
    val value: Double,
    val unit: String,
)

object WeatherPlanningAlertEngine {

    fun evaluate(
        forecast: WeatherForecast,
        settings: RainAlertSettings,
    ): List<WeatherPlanningAlert> {
        val horizon = settings.horizonDays.coerceIn(1, 7)
        val result = mutableListOf<WeatherPlanningAlert>()

        forecast.days.take(horizon).forEach { day ->
            if (settings.rainAlertEnabled) {
                val probability = day.precipitationProbabilityPercent
                if (probability != null && probability >= settings.thresholdPercent.coerceIn(0, 100)) {
                    result += WeatherPlanningAlert(
                        kind = WeatherPlanningAlertKind.RAIN,
                        date = day.date,
                        level = if (probability >= 80) {
                            WeatherPlanningAlertLevel.HIGH
                        } else {
                            WeatherPlanningAlertLevel.NOTICE
                        },
                        municipality = forecast.municipality,
                        value = probability.toDouble(),
                        unit = "%",
                    )
                }
            }

            if (settings.windAlertEnabled) {
                val wind = day.windMaxKmh
                if (wind != null && wind >= settings.windThresholdKmh.coerceIn(20, 120)) {
                    result += WeatherPlanningAlert(
                        kind = WeatherPlanningAlertKind.WIND,
                        date = day.date,
                        level = if (wind >= 60.0) {
                            WeatherPlanningAlertLevel.HIGH
                        } else {
                            WeatherPlanningAlertLevel.NOTICE
                        },
                        municipality = forecast.municipality,
                        value = wind,
                        unit = "km/h",
                    )
                }
            }

            if (settings.frostAlertEnabled) {
                val minimum = day.temperatureMinC
                if (minimum != null && minimum <= settings.frostThresholdC.coerceIn(-5, 5)) {
                    result += WeatherPlanningAlert(
                        kind = WeatherPlanningAlertKind.FROST,
                        date = day.date,
                        level = if (minimum <= 0.0) {
                            WeatherPlanningAlertLevel.HIGH
                        } else {
                            WeatherPlanningAlertLevel.NOTICE
                        },
                        municipality = forecast.municipality,
                        value = minimum,
                        unit = "°C",
                    )
                }
            }
        }

        return result.sortedWith(
            compareBy<WeatherPlanningAlert> { it.date }
                .thenByDescending { it.level }
                .thenBy { it.kind.name },
        )
    }

    fun primary(alerts: List<WeatherPlanningAlert>): WeatherPlanningAlert? =
        alerts.sortedWith(
            compareBy<WeatherPlanningAlert> { it.date }
                .thenByDescending { it.level }
                .thenBy {
                    when (it.kind) {
                        WeatherPlanningAlertKind.FROST -> 0
                        WeatherPlanningAlertKind.WIND -> 1
                        WeatherPlanningAlertKind.RAIN -> 2
                    }
                },
        ).firstOrNull()
}
