package com.isivolt.maginaolivo.domain.weather

enum class WeatherTargetSource {
    MANUAL,
    GLOBAL_FALLBACK,
    CATASTRO,
}

data class FarmWeatherTarget(
    val farmId: String,
    val farmName: String,
    val municipalityCode: String,
    val source: WeatherTargetSource,
)

data class FarmWeatherAlert(
    val target: FarmWeatherTarget,
    val alert: WeatherPlanningAlert,
)

object FarmWeatherAlertEngine {
    fun evaluate(
        target: FarmWeatherTarget,
        forecast: WeatherForecast,
        settings: RainAlertSettings,
    ): List<FarmWeatherAlert> =
        WeatherPlanningAlertEngine.evaluate(
            forecast = forecast,
            settings = settings.copy(
                municipalityCode = target.municipalityCode,
            ),
        ).map { alert ->
            FarmWeatherAlert(
                target = target,
                alert = alert,
            )
        }
}
