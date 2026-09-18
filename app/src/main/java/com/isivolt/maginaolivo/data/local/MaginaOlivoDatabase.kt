package com.isivolt.maginaolivo.data.local

import androidx.room.Database
import androidx.room.RoomDatabase

@Database(
    entities = [FarmEntity::class, PlotEntity::class],
    version = 1,
    exportSchema = true,
)
abstract class MaginaOlivoDatabase : RoomDatabase() {
    abstract fun farmDao(): FarmDao
    abstract fun plotDao(): PlotDao
}
