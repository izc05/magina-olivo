package com.isivolt.maginaolivo.data.local

import androidx.room.Database
import androidx.room.RoomDatabase
import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase

@Database(
    entities = [
        FarmEntity::class,
        PlotEntity::class,
        SyncOutboxEntity::class,
    ],
    version = 2,
    exportSchema = true,
)
abstract class MaginaOlivoDatabase : RoomDatabase() {
    abstract fun farmDao(): FarmDao
    abstract fun plotDao(): PlotDao
    abstract fun fieldWriteDao(): FieldWriteDao
    abstract fun syncOutboxDao(): SyncOutboxDao

    companion object {
        val MIGRATION_1_2 = object : Migration(1, 2) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL(
                    """
                    CREATE TABLE IF NOT EXISTS sync_outbox (
                        entityType TEXT NOT NULL,
                        entityId TEXT NOT NULL,
                        operation TEXT NOT NULL,
                        enqueuedAtEpochMs INTEGER NOT NULL,
                        attemptCount INTEGER NOT NULL,
                        lastError TEXT,
                        PRIMARY KEY(entityType, entityId)
                    )
                    """.trimIndent(),
                )
                db.execSQL(
                    """
                    CREATE INDEX IF NOT EXISTS index_sync_outbox_enqueuedAtEpochMs
                    ON sync_outbox(enqueuedAtEpochMs)
                    """.trimIndent(),
                )
            }
        }
    }
}
