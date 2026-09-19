package com.isivolt.maginaolivo.data.remote

import com.isivolt.maginaolivo.domain.weather.WeatherRadarFeed
import com.isivolt.maginaolivo.domain.weather.WeatherRadarFrame
import com.isivolt.maginaolivo.domain.weather.WeatherRadarGateway
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.auth.auth
import io.github.jan.supabase.functions.functions
import io.ktor.client.call.body
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

class SupabaseWeatherRadarGateway(
    private val client: SupabaseClient,
) : WeatherRadarGateway {

    override suspend fun getFrames(): Result<WeatherRadarFeed> = runCatching {
        if (client.auth.currentSessionOrNull() == null) {
            client.auth.signInAnonymously()
        }

        val response = client.functions.invoke(
            function = "weather-radar",
            body = buildJsonObject {
                put("operation", "frames")
            },
        )

        response.body<WeatherRadarResponse>().toDomain()
    }
}

@Serializable
private data class WeatherRadarResponse(
    val provider: String,
    val product: String,
    val observedOnly: Boolean = true,
    val captureIntervalMinutes: Int = 10,
    val retentionFrames: Int = 18,
    val capture: WeatherRadarCaptureDto = WeatherRadarCaptureDto(),
    val frames: List<WeatherRadarFrameDto> = emptyList(),
    val source: WeatherRadarSourceDto = WeatherRadarSourceDto(),
    val servedAt: String,
)

@Serializable
private data class WeatherRadarCaptureDto(
    val status: String = "unknown",
    val message: String? = null,
)

@Serializable
private data class WeatherRadarFrameDto(
    val id: String,
    val capturedAt: String,
    val imageUrl: String,
    val sha256: String,
)

@Serializable
private data class WeatherRadarSourceDto(
    val attribution: String = "AEMET",
    val scopeNote: String = "Radar observado de precipitación.",
)

private fun WeatherRadarResponse.toDomain(): WeatherRadarFeed =
    WeatherRadarFeed(
        provider = provider,
        product = product,
        observedOnly = observedOnly,
        captureIntervalMinutes = captureIntervalMinutes,
        retentionFrames = retentionFrames,
        captureStatus = capture.status,
        captureMessage = capture.message,
        frames = frames.map { frame ->
            WeatherRadarFrame(
                id = frame.id,
                capturedAt = frame.capturedAt,
                imageUrl = frame.imageUrl,
                sha256 = frame.sha256,
            )
        },
        attribution = source.attribution,
        scopeNote = source.scopeNote,
        servedAt = servedAt,
    )
