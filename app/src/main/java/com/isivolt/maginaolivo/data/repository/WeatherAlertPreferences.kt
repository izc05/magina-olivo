package com.isivolt.maginaolivo.data.repository

import android.content.Context
import com.isivolt.maginaolivo.domain.weather.MaginaWeatherMunicipalities
import com.isivolt.maginaolivo.domain.weather.RainAlertSettings

class WeatherAlertPreferences(
    context: Context,
) {
    private val preferences =
        context.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)

    fun read(): RainAlertSettings =
        RainAlertSettings(
            notificationsEnabled = preferences.getBoolean(KEY_ENABLED, false),
            municipalityCode = preferences.getString(
                KEY_MUNICIPALITY,
                MaginaWeatherMunicipalities.default.code,
            ) ?: MaginaWeatherMunicipalities.default.code,
            thresholdPercent = preferences.getInt(KEY_THRESHOLD, DEFAULT_THRESHOLD),
            horizonDays = preferences.getInt(KEY_HORIZON_DAYS, DEFAULT_HORIZON_DAYS),
        )

    fun setNotificationsEnabled(enabled: Boolean) {
        preferences.edit().putBoolean(KEY_ENABLED, enabled).apply()
    }

    fun setMunicipalityCode(code: String) {
        preferences.edit().putString(KEY_MUNICIPALITY, code).apply()
    }

    fun setThresholdPercent(value: Int) {
        preferences.edit()
            .putInt(KEY_THRESHOLD, value.coerceIn(30, 100))
            .apply()
    }

    fun setHorizonDays(value: Int) {
        preferences.edit()
            .putInt(KEY_HORIZON_DAYS, value.coerceIn(1, 3))
            .apply()
    }

    fun lastNotificationKey(): String? =
        preferences.getString(KEY_LAST_NOTIFICATION, null)

    fun setLastNotificationKey(value: String?) {
        preferences.edit().apply {
            if (value == null) {
                remove(KEY_LAST_NOTIFICATION)
            } else {
                putString(KEY_LAST_NOTIFICATION, value)
            }
        }.apply()
    }

    private companion object {
        const val PREFERENCES_NAME = "magina_weather_alerts"
        const val KEY_ENABLED = "notifications_enabled"
        const val KEY_MUNICIPALITY = "municipality_code"
        const val KEY_THRESHOLD = "threshold_percent"
        const val KEY_HORIZON_DAYS = "horizon_days"
        const val KEY_LAST_NOTIFICATION = "last_notification_key"
        const val DEFAULT_THRESHOLD = 60
        const val DEFAULT_HORIZON_DAYS = 2
    }
}
