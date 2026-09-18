package com.isivolt.maginaolivo

import android.app.Application
import androidx.room.Room
import com.isivolt.maginaolivo.data.local.MaginaOlivoDatabase
import com.isivolt.maginaolivo.data.remote.SupabaseProvider
import com.isivolt.maginaolivo.data.remote.SupabaseWeatherGateway
import com.isivolt.maginaolivo.data.repository.LocalFieldRepository
import com.isivolt.maginaolivo.data.repository.SharedPreferencesWeatherForecastCache
import com.isivolt.maginaolivo.data.repository.WeatherRepository
import org.maplibre.android.MapLibre

class MaginaOlivoApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        MapLibre.getInstance(this)
    }

    val database: MaginaOlivoDatabase by lazy {
        Room.databaseBuilder(
            applicationContext,
            MaginaOlivoDatabase::class.java,
            "magina-olivo.db",
        ).build()
    }

    val fieldRepository: LocalFieldRepository by lazy {
        LocalFieldRepository(
            farmDao = database.farmDao(),
            plotDao = database.plotDao(),
        )
    }

    val weatherRepository: WeatherRepository by lazy {
        WeatherRepository(
            gateway = SupabaseProvider.client?.let(::SupabaseWeatherGateway),
            cache = SharedPreferencesWeatherForecastCache(applicationContext),
        )
    }
}
