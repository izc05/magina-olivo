package com.isivolt.maginaolivo

import android.app.Application
import androidx.room.Room
import com.isivolt.maginaolivo.data.local.LocalIdentityRepository
import com.isivolt.maginaolivo.data.local.MaginaOlivoDatabase
import com.isivolt.maginaolivo.data.notification.WeatherAlertNotifier
import com.isivolt.maginaolivo.data.remote.SupabaseProvider
import com.isivolt.maginaolivo.data.remote.SupabaseWeatherGateway
import com.isivolt.maginaolivo.data.remote.SupabaseWeatherRadarGateway
import com.isivolt.maginaolivo.data.repository.LocalFieldRepository
import com.isivolt.maginaolivo.data.repository.SharedPreferencesWeatherForecastCache
import com.isivolt.maginaolivo.data.repository.WeatherRadarRepository
import com.isivolt.maginaolivo.data.repository.WeatherRepository
import com.isivolt.maginaolivo.data.sync.FieldSyncScheduler
import com.isivolt.maginaolivo.data.sync.WorkManagerFieldSyncScheduler
import com.isivolt.maginaolivo.data.worker.WeatherRainAlertScheduler
import org.maplibre.android.MapLibre

class MaginaOlivoApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        MapLibre.getInstance(this)
        WeatherAlertNotifier.createChannel(this)
        WeatherRainAlertScheduler.ensureScheduled(this)

        if (SupabaseProvider.isConfigured) {
            fieldSyncScheduler.schedule()
        }
    }

    val database: MaginaOlivoDatabase by lazy {
        Room.databaseBuilder(
            applicationContext,
            MaginaOlivoDatabase::class.java,
            "magina-olivo.db",
        )
            .addMigrations(
                MaginaOlivoDatabase.MIGRATION_1_2,
                MaginaOlivoDatabase.MIGRATION_2_3,
            )
            .build()
    }

    val localIdentityRepository: LocalIdentityRepository by lazy {
        LocalIdentityRepository(database.localProfileDao())
    }

    val fieldSyncScheduler: FieldSyncScheduler by lazy {
        if (SupabaseProvider.isConfigured) {
            WorkManagerFieldSyncScheduler(applicationContext)
        } else {
            FieldSyncScheduler {}
        }
    }

    val fieldRepository: LocalFieldRepository by lazy {
        LocalFieldRepository(
            farmDao = database.farmDao(),
            plotDao = database.plotDao(),
            fieldWriteDao = database.fieldWriteDao(),
            syncScheduler = fieldSyncScheduler,
            localIdentityRepository = localIdentityRepository,
        )
    }

    val weatherRepository: WeatherRepository by lazy {
        WeatherRepository(
            gateway = SupabaseProvider.client?.let(::SupabaseWeatherGateway),
            cache = SharedPreferencesWeatherForecastCache(applicationContext),
        )
    }

    val weatherRadarRepository: WeatherRadarRepository by lazy {
        WeatherRadarRepository(
            gateway = SupabaseProvider.client?.let(::SupabaseWeatherRadarGateway),
            context = applicationContext,
        )
    }
}
