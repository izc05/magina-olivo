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
import com.isivolt.maginaolivo.domain.weather.RainAlert
import com.isivolt.maginaolivo.domain.weather.RainAlertLevel
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.util.Locale

object WeatherAlertNotifier {
    const val CHANNEL_ID = "weather_rain_alerts"

    fun createChannel(context: Context) {
        val manager = context.getSystemService(NotificationManager::class.java)
        val channel = NotificationChannel(
            CHANNEL_ID,
            "Avisos de lluvia",
            NotificationManager.IMPORTANCE_DEFAULT,
        ).apply {
            description =
                "Avisos de Mágina Olivo basados en la predicción municipal de AEMET."
        }
        manager.createNotificationChannel(channel)
    }

    fun notificationsAllowed(context: Context): Boolean =
        Build.VERSION.SDK_INT < 33 ||
            context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) ==
            PackageManager.PERMISSION_GRANTED

    fun notify(
        context: Context,
        alert: RainAlert,
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

        val title = when (alert.level) {
            RainAlertLevel.HIGH -> "Alta probabilidad de lluvia"
            RainAlertLevel.NOTICE -> "Lluvia prevista"
        }
        val body =
            "${alert.municipality.name}: ${alert.precipitationProbabilityPercent}% " +
                "para ${dateLabel(alert.date)}. Revisa la previsión antes de planificar trabajos."

        val notification = Notification.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_rain_alert)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(Notification.BigTextStyle().bigText(body))
            .setCategory(Notification.CATEGORY_REMINDER)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .build()

        return runCatching {
            context.getSystemService(NotificationManager::class.java)
                .notify(notificationId(alert), notification)
            true
        }.getOrDefault(false)
    }

    private fun notificationId(alert: RainAlert): Int =
        ("rain|" + alert.municipality.code + "|" + alert.date)
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
}
