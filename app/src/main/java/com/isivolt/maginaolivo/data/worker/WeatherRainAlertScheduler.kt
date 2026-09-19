package com.isivolt.maginaolivo.data.worker

import android.content.Context
import androidx.work.Constraints
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import com.isivolt.maginaolivo.data.repository.WeatherAlertPreferences
import java.util.concurrent.TimeUnit

object WeatherRainAlertScheduler {
    private const val PERIODIC_WORK_NAME = "weather-rain-alert-periodic"
    private const val IMMEDIATE_WORK_NAME = "weather-rain-alert-immediate"

    fun ensureScheduled(context: Context) {
        if (WeatherAlertPreferences(context).read().notificationsEnabled) {
            schedule(context)
        } else {
            cancel(context)
        }
    }

    fun schedule(context: Context) {
        val constraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build()

        val request = PeriodicWorkRequestBuilder<WeatherRainAlertWorker>(
            6,
            TimeUnit.HOURS,
            1,
            TimeUnit.HOURS,
        )
            .setConstraints(constraints)
            .build()

        WorkManager.getInstance(context).enqueueUniquePeriodicWork(
            PERIODIC_WORK_NAME,
            ExistingPeriodicWorkPolicy.UPDATE,
            request,
        )
    }

    fun checkNow(context: Context) {
        val request = OneTimeWorkRequestBuilder<WeatherRainAlertWorker>()
            .setConstraints(
                Constraints.Builder()
                    .setRequiredNetworkType(NetworkType.CONNECTED)
                    .build(),
            )
            .build()

        WorkManager.getInstance(context).enqueueUniqueWork(
            IMMEDIATE_WORK_NAME,
            ExistingWorkPolicy.REPLACE,
            request,
        )
    }

    fun cancel(context: Context) {
        val workManager = WorkManager.getInstance(context)
        workManager.cancelUniqueWork(PERIODIC_WORK_NAME)
        workManager.cancelUniqueWork(IMMEDIATE_WORK_NAME)
    }
}
