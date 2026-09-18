package com.isivolt.maginaolivo

import android.app.Application
import androidx.room.Room
import com.isivolt.maginaolivo.data.local.MaginaOlivoDatabase

class MaginaOlivoApplication : Application() {
    val database: MaginaOlivoDatabase by lazy {
        Room.databaseBuilder(
            applicationContext,
            MaginaOlivoDatabase::class.java,
            "magina-olivo.db",
        ).build()
    }
}
