package com.isivolt.maginaolivo.ui.home

data class HomeWeatherAlertSummary(
    val totalCount: Int,
    val highCount: Int,
    val primaryTitle: String?,
    val primaryDetail: String?,
    val horizonDays: Int,
    val degraded: Boolean,
)

fun interface HomeWeatherAlertSummarySource {
    suspend fun loadSummary(): Result<HomeWeatherAlertSummary>
}

sealed interface HomeWeatherAlertCardState {
    data object PendingIntegration : HomeWeatherAlertCardState
    data object Loading : HomeWeatherAlertCardState
    data class Ready(val summary: HomeWeatherAlertSummary) : HomeWeatherAlertCardState
    data class Error(val message: String) : HomeWeatherAlertCardState
}
