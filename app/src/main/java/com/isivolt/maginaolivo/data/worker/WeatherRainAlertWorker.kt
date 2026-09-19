package com.isivolt.maginaolivo.data.worker

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.isivolt.maginaolivo.MaginaOlivoApplication
import com.isivolt.maginaolivo.data.notification.WeatherAlertNotifier
import com.isivolt.maginaolivo.data.remote.SupabaseProvider
import com.isivolt.maginaolivo.data.remote.SupabaseWeatherGateway
import com.isivolt.maginaolivo.data.repository.FarmWeatherAssignmentPreferences
import com.isivolt.maginaolivo.data.repository.SharedPreferencesWeatherForecastCache
import com.isivolt.maginaolivo.data.repository.WeatherAlertPreferences
import com.isivolt.maginaolivo.data.repository.WeatherRepository
import com.isivolt.maginaolivo.domain.weather.FarmWeatherAlertEngine
import com.isivolt.maginaolivo.domain.weather.RainAlertSettings
import com.isivolt.maginaolivo.domain.weather.WeatherPlanningAlert
import com.isivolt.maginaolivo.domain.weather.WeatherPlanningAlertEngine
import com.isivolt.maginaolivo.domain.weather.WeatherPlanningAlertKind
import kotlinx.coroutines.flow.first

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

        val app = applicationContext as? MaginaOlivoApplication
        val farms = app?.fieldRepository?.observeFarms()?.first().orEmpty()

        if (farms.isEmpty()) {
            return processGlobal(
                repository = repository,
                preferences = preferences,
                settings = settings,
            )
        }

        val assignments = FarmWeatherAssignmentPreferences(applicationContext)
        val targets = farms.map { farm ->
            assignments.resolve(
                farm = farm,
                fallbackMunicipalityCode = settings.municipalityCode,
            )
        }

        var providerFailure = false

        targets.groupBy { it.municipalityCode }.forEach { (municipalityCode, municipalityTargets) ->
            val loaded = repository.loadForecast(municipalityCode)
                .getOrElse {
                    providerFailure = true
                    return@forEach
                }

            // Never create new automatic notifications from stale/local fallback data.
            if (loaded.degraded) {
                return@forEach
            }

            municipalityTargets.forEach { target ->
                val farmAlerts = FarmWeatherAlertEngine.evaluate(
                    target = target,
                    forecast = loaded.forecast,
                    settings = settings,
                ).map { it.alert }

                notifyByKind(
                    alerts = farmAlerts,
                    preferences = preferences,
                    settings = settings,
                    scopeId = target.farmId,
                    farmName = target.farmName,
                )
            }
        }

        return if (providerFailure) Result.retry() else Result.success()
    }

    private suspend fun processGlobal(
        repository: WeatherRepository,
        preferences: WeatherAlertPreferences,
        settings: RainAlertSettings,
    ): Result {
        val loaded = repository.loadForecast(settings.municipalityCode)
            .getOrElse { return Result.retry() }

        if (loaded.degraded) {
            return Result.success()
        }

        notifyByKind(
            alerts = WeatherPlanningAlertEngine.evaluate(
                forecast = loaded.forecast,
                settings = settings,
            ),
            preferences = preferences,
            settings = settings,
            scopeId = "global",
            farmName = null,
        )

        return Result.success()
    }

    private fun notifyByKind(
        alerts: List<WeatherPlanningAlert>,
        preferences: WeatherAlertPreferences,
        settings: RainAlertSettings,
        scopeId: String,
        farmName: String?,
    ) {
        WeatherPlanningAlertKind.entries.forEach { kind ->
            val primary = primaryForKind(alerts, kind)

            if (primary == null) {
                preferences.setLastNotificationKey(
                    kind = kind,
                    value = null,
                    scopeId = scopeId,
                )
                return@forEach
            }

            val notificationKey = listOf(
                primary.kind.name,
                primary.municipality.code,
                primary.date,
                primary.level.name,
                thresholdKey(primary, settings),
            ).joinToString("|")

            if (
                notificationKey == preferences.lastNotificationKey(
                    kind = kind,
                    scopeId = scopeId,
                )
            ) {
                return@forEach
            }

            val delivered = WeatherAlertNotifier.notify(
                context = applicationContext,
                alert = primary,
                scopeId = scopeId,
                farmName = farmName,
            )

            if (delivered) {
                preferences.setLastNotificationKey(
                    kind = kind,
                    value = notificationKey,
                    scopeId = scopeId,
                )
            }
        }
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
        settings: RainAlertSettings,
    ): String =
        when (alert.kind) {
            WeatherPlanningAlertKind.RAIN -> settings.thresholdPercent.toString()
            WeatherPlanningAlertKind.WIND -> settings.windThresholdKmh.toString()
            WeatherPlanningAlertKind.FROST -> settings.frostThresholdC.toString()
        }
}
