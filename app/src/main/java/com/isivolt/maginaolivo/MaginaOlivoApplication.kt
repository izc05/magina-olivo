package com.isivolt.maginaolivo

import android.app.Application
import androidx.room.Room
import com.isivolt.maginaolivo.data.local.MaginaOlivoDatabase
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
}
