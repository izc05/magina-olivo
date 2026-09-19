package com.isivolt.maginaolivo.ui.home

data class HomeWeatherSummary(
    val municipalityName: String,
    val skyDescription: String?,
    val temperatureMinC: Double?,
    val temperatureMaxC: Double?,
    val precipitationProbabilityPercent: Int?,
    val providerLabel: String,
    val freshnessLabel: String,
    val degraded: Boolean,
)

fun interface HomeWeatherSummarySource {
    suspend fun loadSummary(): Result<HomeWeatherSummary>
}

sealed interface HomeWeatherCardState {
    data object PendingIntegration : HomeWeatherCardState
    data object Loading : HomeWeatherCardState
    data class Ready(val summary: HomeWeatherSummary) : HomeWeatherCardState
    data class Error(val message: String) : HomeWeatherCardState
}
