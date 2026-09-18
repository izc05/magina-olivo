package com.isivolt.maginaolivo.domain.weather

enum class RainAlertLevel {
    NOTICE,
    HIGH,
}

data class RainAlert(
    val date: String,
    val precipitationProbabilityPercent: Int,
    val level: RainAlertLevel,
    val municipality: WeatherMunicipality,
)

data class RainAlertSettings(
    val notificationsEnabled: Boolean = false,
    val municipalityCode: String = MaginaWeatherMunicipalities.default.code,
    val thresholdPercent: Int = 60,
    val horizonDays: Int = 2,
    val rainAlertEnabled: Boolean = true,
    val windAlertEnabled: Boolean = false,
    val windThresholdKmh: Int = 40,
    val frostAlertEnabled: Boolean = false,
    val frostThresholdC: Int = 2,
)
