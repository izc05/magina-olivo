package com.isivolt.maginaolivo.data.repository

import android.content.Context
import com.isivolt.maginaolivo.domain.weather.WeatherDeliveryMode
import com.isivolt.maginaolivo.domain.weather.WeatherForecast
import com.isivolt.maginaolivo.domain.weather.WeatherGateway
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

interface WeatherForecastCache {
    fun read(municipalityCode: String): WeatherForecast?
    fun write(forecast: WeatherForecast)
}

class SharedPreferencesWeatherForecastCache(
    context: Context,
) : WeatherForecastCache {

    private val preferences =
        context.getSharedPreferences("magina_weather_cache", Context.MODE_PRIVATE)

    private val json = Json {
        ignoreUnknownKeys = true
        encodeDefaults = true
    }

    override fun read(municipalityCode: String): WeatherForecast? {
        val payload = preferences.getString(key(municipalityCode), null) ?: return null
        return runCatching {
            json.decodeFromString<WeatherForecast>(payload)
        }.getOrNull()
    }

    override fun write(forecast: WeatherForecast) {
        preferences.edit()
            .putString(key(forecast.municipality.code), json.encodeToString(forecast))
            .apply()
    }

    private fun key(municipalityCode: String): String = "forecast_$municipalityCode"
}

data class WeatherLoadResult(
    val forecast: WeatherForecast,
    val fromLocalCache: Boolean,
    val degraded: Boolean,
)

class WeatherRepository(
    private val gateway: WeatherGateway?,
    private val cache: WeatherForecastCache,
    private val nowEpochMs: () -> Long = System::currentTimeMillis,
) {
    suspend fun loadForecast(
        municipalityCode: String,
    ): Result<WeatherLoadResult> {
        val cached = cache.read(municipalityCode)
        val activeGateway = gateway

        if (activeGateway == null) {
            return cached?.let {
                Result.success(
                    WeatherLoadResult(
                        forecast = it.copy(deliveryMode = WeatherDeliveryMode.DEGRADED_CACHE),
                        fromLocalCache = true,
                        degraded = true,
                    ),
                )
            } ?: Result.failure(
                IllegalStateException("Supabase no está configurado y no hay una predicción guardada."),
            )
        }

        val remote = activeGateway.getForecast(municipalityCode)
        remote.getOrNull()?.let { forecast ->
            val stored = forecast.copy(savedAtEpochMs = nowEpochMs())
            cache.write(stored)
            return Result.success(
                WeatherLoadResult(
                    forecast = stored,
                    fromLocalCache = false,
                    degraded = forecast.deliveryMode == WeatherDeliveryMode.DEGRADED_CACHE,
                ),
            )
        }

        if (cached != null) {
            return Result.success(
                WeatherLoadResult(
                    forecast = cached.copy(deliveryMode = WeatherDeliveryMode.DEGRADED_CACHE),
                    fromLocalCache = true,
                    degraded = true,
                ),
            )
        }

        return Result.failure(
            remote.exceptionOrNull()
                ?: IllegalStateException("No se ha podido cargar la predicción."),
        )
    }
}
