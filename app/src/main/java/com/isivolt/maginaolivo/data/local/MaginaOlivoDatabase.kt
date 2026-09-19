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
        LocalProfileEntity::class,
        CampaignEntity::class,
        CampaignParcelEntity::class,
    ],
    version = 3,
    exportSchema = true,
)
abstract class MaginaOlivoDatabase : RoomDatabase() {
    abstract fun farmDao(): FarmDao
    abstract fun plotDao(): PlotDao
    abstract fun fieldWriteDao(): FieldWriteDao
    abstract fun syncOutboxDao(): SyncOutboxDao
    abstract fun localProfileDao(): LocalProfileDao
    abstract fun campaignDao(): CampaignDao
    abstract fun campaignParcelDao(): CampaignParcelDao

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

        val MIGRATION_2_3 = object : Migration(2, 3) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL(
                    """
                    CREATE TABLE IF NOT EXISTS local_profiles (
                        slot INTEGER NOT NULL,
                        id TEXT NOT NULL,
                        authUserId TEXT,
                        mode TEXT NOT NULL,
                        createdAtEpochMs INTEGER NOT NULL,
                        updatedAtEpochMs INTEGER NOT NULL,
                        PRIMARY KEY(slot)
                    )
                    """.trimIndent(),
                )
                db.execSQL(
                    """
                    CREATE UNIQUE INDEX IF NOT EXISTS index_local_profiles_id
                    ON local_profiles(id)
                    """.trimIndent(),
                )
                db.execSQL(
                    """
                    INSERT OR IGNORE INTO local_profiles(
                        slot,
                        id,
                        authUserId,
                        mode,
                        createdAtEpochMs,
                        updatedAtEpochMs
                    )
                    VALUES(
                        1,
                        lower(
                            hex(randomblob(4)) || '-' ||
                            hex(randomblob(2)) || '-4' ||
                            substr(hex(randomblob(2)), 2) || '-8' ||
                            substr(hex(randomblob(2)), 2) || '-' ||
                            hex(randomblob(6))
                        ),
                        NULL,
                        'local',
                        CAST(strftime('%s','now') AS INTEGER) * 1000,
                        CAST(strftime('%s','now') AS INTEGER) * 1000
                    )
                    """.trimIndent(),
                )

                db.execSQL("ALTER TABLE farms ADD COLUMN ownerId TEXT NOT NULL DEFAULT ''")
                db.execSQL("ALTER TABLE farms ADD COLUMN municipality TEXT")
                db.execSQL("ALTER TABLE farms ADD COLUMN province TEXT")
                db.execSQL("ALTER TABLE farms ADD COLUMN description TEXT")
                db.execSQL("ALTER TABLE farms ADD COLUMN coverDocumentId TEXT")
                db.execSQL("ALTER TABLE farms ADD COLUMN createdAtEpochMs INTEGER NOT NULL DEFAULT 0")
                db.execSQL("ALTER TABLE farms ADD COLUMN deletedAtEpochMs INTEGER")
                db.execSQL("ALTER TABLE farms ADD COLUMN remoteVersion INTEGER NOT NULL DEFAULT 0")
                db.execSQL("ALTER TABLE farms ADD COLUMN baseRemoteVersion INTEGER NOT NULL DEFAULT 0")
                db.execSQL("ALTER TABLE farms ADD COLUMN lastSyncedAtEpochMs INTEGER")
                db.execSQL(
                    """
                    UPDATE farms
                    SET ownerId = (SELECT id FROM local_profiles WHERE slot = 1),
                        createdAtEpochMs = updatedAtEpochMs
                    """.trimIndent(),
                )
                db.execSQL(
                    """
                    CREATE INDEX IF NOT EXISTS index_farms_ownerId
                    ON farms(ownerId)
                    """.trimIndent(),
                )

                db.execSQL("ALTER TABLE plots ADD COLUMN ownerId TEXT NOT NULL DEFAULT ''")
                db.execSQL("ALTER TABLE plots ADD COLUMN areaSquareMetersDecimal TEXT")
                db.execSQL("ALTER TABLE plots ADD COLUMN oliveTreeCount INTEGER")
                db.execSQL("ALTER TABLE plots ADD COLUMN mainVariety TEXT")
                db.execSQL("ALTER TABLE plots ADD COLUMN createdAtEpochMs INTEGER NOT NULL DEFAULT 0")
                db.execSQL("ALTER TABLE plots ADD COLUMN deletedAtEpochMs INTEGER")
                db.execSQL("ALTER TABLE plots ADD COLUMN remoteVersion INTEGER NOT NULL DEFAULT 0")
                db.execSQL("ALTER TABLE plots ADD COLUMN baseRemoteVersion INTEGER NOT NULL DEFAULT 0")
                db.execSQL("ALTER TABLE plots ADD COLUMN lastSyncedAtEpochMs INTEGER")
                db.execSQL(
                    """
                    UPDATE plots
                    SET ownerId = (SELECT id FROM local_profiles WHERE slot = 1),
                        createdAtEpochMs = updatedAtEpochMs,
                        areaSquareMetersDecimal =
                            CASE
                                WHEN areaHa IS NULL THEN NULL
                                ELSE CAST(areaHa * 10000.0 AS TEXT)
                            END
                    """.trimIndent(),
                )
                db.execSQL(
                    """
                    CREATE INDEX IF NOT EXISTS index_plots_ownerId
                    ON plots(ownerId)
                    """.trimIndent(),
                )
                db.execSQL("DROP INDEX IF EXISTS index_plots_cadastralReference")
                db.execSQL(
                    """
                    CREATE UNIQUE INDEX IF NOT EXISTS index_plots_ownerId_cadastralReference
                    ON plots(ownerId, cadastralReference)
                    """.trimIndent(),
                )

                db.execSQL(
                    """
                    CREATE TABLE IF NOT EXISTS campaigns (
                        id TEXT NOT NULL,
                        ownerId TEXT NOT NULL,
                        farmId TEXT NOT NULL,
                        name TEXT NOT NULL,
                        startDateEpochDay INTEGER,
                        endDateEpochDay INTEGER,
                        status TEXT NOT NULL,
                        createdAtEpochMs INTEGER NOT NULL,
                        updatedAtEpochMs INTEGER NOT NULL,
                        deletedAtEpochMs INTEGER,
                        remoteVersion INTEGER NOT NULL DEFAULT 0,
                        baseRemoteVersion INTEGER NOT NULL DEFAULT 0,
                        syncState TEXT NOT NULL,
                        lastSyncedAtEpochMs INTEGER,
                        PRIMARY KEY(id)
                    )
                    """.trimIndent(),
                )
                db.execSQL("CREATE INDEX IF NOT EXISTS index_campaigns_ownerId ON campaigns(ownerId)")
                db.execSQL("CREATE INDEX IF NOT EXISTS index_campaigns_farmId ON campaigns(farmId)")
                db.execSQL("CREATE INDEX IF NOT EXISTS index_campaigns_status ON campaigns(status)")

                db.execSQL(
                    """
                    CREATE TABLE IF NOT EXISTS campaign_parcels (
                        id TEXT NOT NULL,
                        ownerId TEXT NOT NULL,
                        campaignId TEXT NOT NULL,
                        parcelId TEXT NOT NULL,
                        createdAtEpochMs INTEGER NOT NULL,
                        updatedAtEpochMs INTEGER NOT NULL,
                        deletedAtEpochMs INTEGER,
                        remoteVersion INTEGER NOT NULL DEFAULT 0,
                        baseRemoteVersion INTEGER NOT NULL DEFAULT 0,
                        syncState TEXT NOT NULL,
                        lastSyncedAtEpochMs INTEGER,
                        PRIMARY KEY(id)
                    )
                    """.trimIndent(),
                )
                db.execSQL(
                    "CREATE INDEX IF NOT EXISTS index_campaign_parcels_ownerId ON campaign_parcels(ownerId)",
                )
                db.execSQL(
                    "CREATE INDEX IF NOT EXISTS index_campaign_parcels_campaignId ON campaign_parcels(campaignId)",
                )
                db.execSQL(
                    "CREATE INDEX IF NOT EXISTS index_campaign_parcels_parcelId ON campaign_parcels(parcelId)",
                )
            }
        }
    }
}
