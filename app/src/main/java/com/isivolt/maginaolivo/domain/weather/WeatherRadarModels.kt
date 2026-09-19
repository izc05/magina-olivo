package com.isivolt.maginaolivo.domain.weather

import kotlinx.serialization.Serializable

@Serializable
data class WeatherRadarFrame(
    val id: String,
    val capturedAt: String,
    val imageUrl: String,
    val sha256: String,
)

@Serializable
data class WeatherRadarFeed(
    val provider: String,
    val product: String,
    val observedOnly: Boolean,
    val captureIntervalMinutes: Int,
    val retentionFrames: Int,
    val captureStatus: String,
    val captureMessage: String? = null,
    val frames: List<WeatherRadarFrame>,
    val attribution: String,
    val scopeNote: String,
    val servedAt: String,
)

interface WeatherRadarGateway {
    suspend fun getFrames(): Result<WeatherRadarFeed>
}
