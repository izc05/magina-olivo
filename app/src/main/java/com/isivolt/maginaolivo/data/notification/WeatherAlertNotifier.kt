package com.isivolt.maginaolivo.data.notification

import android.Manifest
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import com.isivolt.maginaolivo.MainActivity
import com.isivolt.maginaolivo.R
import com.isivolt.maginaolivo.domain.weather.WeatherPlanningAlert
import com.isivolt.maginaolivo.domain.weather.WeatherPlanningAlertKind
import com.isivolt.maginaolivo.domain.weather.WeatherPlanningAlertLevel
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.util.Locale

object WeatherAlertNotifier {
    const val CHANNEL_ID = "weather_planning_alerts"

    fun createChannel(context: Context) {
        val manager = context.getSystemService(NotificationManager::class.java)
        val channel = NotificationChannel(
            CHANNEL_ID,
            "Avisos meteorológicos",
            NotificationManager.IMPORTANCE_DEFAULT,
        ).apply {
            description =
                "Avisos de planificación de Mágina Olivo basados en la predicción municipal de AEMET."
        }
        manager.createNotificationChannel(channel)
    }

    fun notificationsAllowed(context: Context): Boolean =
        Build.VERSION.SDK_INT < 33 ||
            context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) ==
            PackageManager.PERMISSION_GRANTED

    fun notify(
        context: Context,
        alert: WeatherPlanningAlert,
        scopeId: String = "global",
        farmName: String? = null,
    ): Boolean {
        if (!notificationsAllowed(context)) return false

        createChannel(context)

        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
        }
        val pendingIntent = PendingIntent.getActivity(
            context,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

        val baseTitle = titleFor(alert)
        val title = farmName?.takeIf { it.isNotBlank() }?.let { "$it · $baseTitle" } ?: baseTitle
        val body = bodyFor(alert, farmName)

        val notification = Notification.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_weather_alert)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(Notification.BigTextStyle().bigText(body))
            .setCategory(Notification.CATEGORY_REMINDER)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .build()

        return runCatching {
            context.getSystemService(NotificationManager::class.java)
                .notify(notificationId(alert, scopeId), notification)
            true
        }.getOrDefault(false)
    }

    private fun titleFor(alert: WeatherPlanningAlert): String =
        when (alert.kind) {
            WeatherPlanningAlertKind.RAIN ->
                if (alert.level == WeatherPlanningAlertLevel.HIGH) {
                    "Alta probabilidad de lluvia"
                } else {
                    "Lluvia prevista"
                }

            WeatherPlanningAlertKind.WIND ->
                if (alert.level == WeatherPlanningAlertLevel.HIGH) {
                    "Viento fuerte previsto"
                } else {
                    "Aviso de viento"
                }

            WeatherPlanningAlertKind.FROST ->
                if (alert.level == WeatherPlanningAlertLevel.HIGH) {
                    "Temperatura mínima de helada"
                } else {
                    "Posible riesgo de helada"
                }
        }

    private fun bodyFor(
        alert: WeatherPlanningAlert,
        farmName: String?,
    ): String {
        val value = when (alert.kind) {
            WeatherPlanningAlertKind.RAIN ->
                "${alert.value.toInt()}%"
            WeatherPlanningAlertKind.WIND ->
                "${formatNumber(alert.value)} km/h"
            WeatherPlanningAlertKind.FROST ->
                "${formatNumber(alert.value)} °C"
        }

        val advice = when (alert.kind) {
            WeatherPlanningAlertKind.RAIN ->
                "Revisa la previsión antes de planificar trabajos."
            WeatherPlanningAlertKind.WIND ->
                "Revisa las condiciones antes de realizar trabajos expuestos."
            WeatherPlanningAlertKind.FROST ->
                "Comprueba la situación local de la finca antes de tomar decisiones."
        }

        val place = farmName?.takeIf { it.isNotBlank() }?.let {
            "$it · ${alert.municipality.name}"
        } ?: alert.municipality.name

        return "$place: $value para ${dateLabel(alert.date)}. $advice"
    }

    private fun notificationId(
        alert: WeatherPlanningAlert,
        scopeId: String,
    ): Int =
        (
            scopeId + "|" +
                alert.kind.name + "|" +
                alert.municipality.code + "|" +
                alert.date
            )
            .hashCode()
            .and(0x7fffffff)

    private fun dateLabel(value: String): String {
        val date = runCatching { LocalDate.parse(value.take(10)) }.getOrNull()
            ?: return value
        val today = LocalDate.now()

        return when (date) {
            today -> "hoy"
            today.plusDays(1) -> "mañana"
            else -> date.format(
                DateTimeFormatter.ofPattern("EEEE d MMMM", Locale("es", "ES")),
            )
        }
    }

    private fun formatNumber(value: Double): String =
        if (value % 1.0 == 0.0) {
            value.toInt().toString()
        } else {
            String.format(Locale("es", "ES"), "%.1f", value)
        }
}
