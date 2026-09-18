package com.isivolt.maginaolivo.domain.weather

object RainAlertEngine {

    fun evaluate(
        forecast: WeatherForecast,
        settings: RainAlertSettings,
    ): List<RainAlert> {
        val threshold = settings.thresholdPercent.coerceIn(0, 100)
        val horizon = settings.horizonDays.coerceIn(1, 7)

        return forecast.days
            .take(horizon)
            .mapNotNull { day ->
                val probability = day.precipitationProbabilityPercent ?: return@mapNotNull null
                if (probability < threshold) return@mapNotNull null

                RainAlert(
                    date = day.date,
                    precipitationProbabilityPercent = probability,
                    level = if (probability >= HIGH_PROBABILITY_PERCENT) {
                        RainAlertLevel.HIGH
                    } else {
                        RainAlertLevel.NOTICE
                    },
                    municipality = forecast.municipality,
                )
            }
    }

    fun primary(alerts: List<RainAlert>): RainAlert? =
        alerts
            .sortedWith(
                compareBy<RainAlert> { it.date }
                    .thenByDescending { it.precipitationProbabilityPercent },
            )
            .firstOrNull()

    private const val HIGH_PROBABILITY_PERCENT = 80
}
