package com.isivolt.maginaolivo.data.worker

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.isivolt.maginaolivo.data.notification.WeatherAlertNotifier
import com.isivolt.maginaolivo.data.remote.SupabaseProvider
import com.isivolt.maginaolivo.data.remote.SupabaseWeatherGateway
import com.isivolt.maginaolivo.data.repository.SharedPreferencesWeatherForecastCache
import com.isivolt.maginaolivo.data.repository.WeatherAlertPreferences
import com.isivolt.maginaolivo.data.repository.WeatherRepository
import com.isivolt.maginaolivo.domain.weather.RainAlertEngine

class WeatherRainAlertWorker(
    appContext: Context,
    params: WorkerParameters,
) : CoroutineWorker(appContext, params) {

    override suspend fun doWork(): Result {
        val preferences = WeatherAlertPreferences(applicationContext)
        val settings = preferences.read()

        if (!settings.notificationsEnabled) {
            return Result.success()
        }

        val gateway = SupabaseProvider.client?.let(::SupabaseWeatherGateway)
            ?: return Result.success()

        val repository = WeatherRepository(
            gateway = gateway,
            cache = SharedPreferencesWeatherForecastCache(applicationContext),
        )

        val loaded = repository.loadForecast(settings.municipalityCode)
            .getOrElse { return Result.retry() }

        if (loaded.degraded) {
            return Result.success()
        }

        val alerts = RainAlertEngine.evaluate(
            forecast = loaded.forecast,
            settings = settings,
        )
        val primary = RainAlertEngine.primary(alerts)

        if (primary == null) {
            preferences.setLastNotificationKey(null)
            return Result.success()
        }

        val notificationKey = listOf(
            primary.municipality.code,
            primary.date,
            primary.level.name,
            settings.thresholdPercent.toString(),
        ).joinToString("|")

        if (notificationKey == preferences.lastNotificationKey()) {
            return Result.success()
        }

        val delivered = WeatherAlertNotifier.notify(
            context = applicationContext,
            alert = primary,
        )

        if (delivered) {
            preferences.setLastNotificationKey(notificationKey)
        }

        return Result.success()
    }
}
