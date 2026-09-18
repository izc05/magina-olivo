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
import com.isivolt.maginaolivo.domain.weather.WeatherPlanningAlert
import com.isivolt.maginaolivo.domain.weather.WeatherPlanningAlertEngine
import com.isivolt.maginaolivo.domain.weather.WeatherPlanningAlertKind

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

        val alerts = WeatherPlanningAlertEngine.evaluate(
            forecast = loaded.forecast,
            settings = settings,
        )

        WeatherPlanningAlertKind.entries.forEach { kind ->
            val primary = primaryForKind(alerts, kind)

            if (primary == null) {
                preferences.setLastNotificationKey(kind, null)
                return@forEach
            }

            val notificationKey = listOf(
                primary.kind.name,
                primary.municipality.code,
                primary.date,
                primary.level.name,
                thresholdKey(primary, settings),
            ).joinToString("|")

            if (notificationKey == preferences.lastNotificationKey(kind)) {
                return@forEach
            }

            val delivered = WeatherAlertNotifier.notify(
                context = applicationContext,
                alert = primary,
            )

            if (delivered) {
                preferences.setLastNotificationKey(kind, notificationKey)
            }
        }

        return Result.success()
    }

    private fun primaryForKind(
        alerts: List<WeatherPlanningAlert>,
        kind: WeatherPlanningAlertKind,
    ): WeatherPlanningAlert? =
        alerts
            .filter { it.kind == kind }
            .sortedWith(
                compareBy<WeatherPlanningAlert> { it.date }
                    .thenByDescending { it.level },
            )
            .firstOrNull()

    private fun thresholdKey(
        alert: WeatherPlanningAlert,
        settings: com.isivolt.maginaolivo.domain.weather.RainAlertSettings,
    ): String =
        when (alert.kind) {
            WeatherPlanningAlertKind.RAIN -> settings.thresholdPercent.toString()
            WeatherPlanningAlertKind.WIND -> settings.windThresholdKmh.toString()
            WeatherPlanningAlertKind.FROST -> settings.frostThresholdC.toString()
        }
}
