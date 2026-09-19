package com.isivolt.maginaolivo.data.local

import android.content.Context
import android.database.sqlite.SQLiteDatabase
import androidx.room.Room
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import com.isivolt.maginaolivo.data.repository.RoomFarmRepository
import com.isivolt.maginaolivo.data.repository.RoomParcelRepository
import com.isivolt.maginaolivo.domain.core.Area
import com.isivolt.maginaolivo.domain.core.Farm
import com.isivolt.maginaolivo.domain.core.Parcel
import java.math.BigDecimal
import java.time.Instant
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class RoomCoreMigrationTest {

    @Test
    fun migration2To3PreservesLegacyDataAndSeedsLocalIdentity() = runBlocking<Unit> {
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        val name = "room-core-migration-" + System.nanoTime() + ".db"
        val file = context.getDatabasePath(name)
        file.parentFile?.mkdirs()
        context.deleteDatabase(name)

        SQLiteDatabase.openOrCreateDatabase(file, null).use { db ->
            db.execSQL(
                """
                CREATE TABLE farms (
                    id TEXT NOT NULL PRIMARY KEY,
                    name TEXT NOT NULL,
                    coverImageUri TEXT,
                    updatedAtEpochMs INTEGER NOT NULL,
                    syncState TEXT NOT NULL
                )
                """.trimIndent(),
            )
            db.execSQL(
                """
                CREATE TABLE plots (
                    id TEXT NOT NULL PRIMARY KEY,
                    farmId TEXT NOT NULL,
                    name TEXT NOT NULL,
                    cadastralReference TEXT,
                    areaHa REAL,
                    boundaryGeoJson TEXT,
                    boundarySource TEXT,
                    updatedAtEpochMs INTEGER NOT NULL,
                    syncState TEXT NOT NULL
                )
                """.trimIndent(),
            )
            db.execSQL("CREATE INDEX index_plots_farmId ON plots(farmId)")
            db.execSQL(
                "CREATE UNIQUE INDEX index_plots_cadastralReference ON plots(cadastralReference)",
            )
            db.execSQL(
                """
                CREATE TABLE sync_outbox (
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
                "CREATE INDEX index_sync_outbox_enqueuedAtEpochMs ON sync_outbox(enqueuedAtEpochMs)",
            )

            db.execSQL(
                "INSERT INTO farms VALUES('farm-1','Finca legacy',NULL,1000,'pending_upload')",
            )
            db.execSQL(
                """
                INSERT INTO plots VALUES(
                    'plot-1','farm-1','Parcela legacy','23013A00700198',
                    1.2345,'{"type":"Polygon","coordinates":[]}','catastro',
                    2000,'pending_upload'
                )
                """.trimIndent(),
            )
            db.execSQL(
                "INSERT INTO sync_outbox VALUES('farm','farm-1','upsert',1000,0,NULL)",
            )
            db.execSQL("PRAGMA user_version = 2")
        }

        val database = Room.databaseBuilder(
            context,
            MaginaOlivoDatabase::class.java,
            name,
        )
            .addMigrations(MaginaOlivoDatabase.MIGRATION_2_3)
            .build()

        try {
            database.openHelper.writableDatabase

            val profile = database.localProfileDao().getActive()
            assertNotNull(profile)
            profile!!

            val farm = database.farmDao().findById("farm-1")
            assertNotNull(farm)
            farm!!
            assertEquals(profile.id, farm.ownerId)
            assertEquals(1000L, farm.createdAtEpochMs)
            assertEquals("Finca legacy", farm.name)

            val plot = database.plotDao().findById("plot-1")
            assertNotNull(plot)
            plot!!
            assertEquals(profile.id, plot.ownerId)
            assertEquals(2000L, plot.createdAtEpochMs)
            assertEquals(
                0,
                BigDecimal(checkNotNull(plot.areaSquareMetersDecimal))
                    .compareTo(BigDecimal("12345")),
            )

            assertNotNull(database.syncOutboxDao().findByEntity("farm", "farm-1"))
            database.campaignDao().observeByFarm("farm-1")
        } finally {
            database.close()
            context.deleteDatabase(name)
        }
    }

    @Test
    fun freshDatabaseCreatesOneStableLocalIdentity() = runBlocking<Unit> {
        val database = inMemoryDatabase()
        try {
            val identity = LocalIdentityRepository(
                dao = database.localProfileDao(),
                clock = { 1234L },
                idFactory = { "11111111-1111-4111-8111-111111111111" },
            )

            val first = identity.ensureProfile()
            val second = identity.ensureProfile()

            assertEquals(first.id, second.id)
            assertEquals("11111111-1111-4111-8111-111111111111", first.id)
            assertEquals(LocalProfileEntity.MODE_LOCAL, first.mode)
            assertNull(first.authUserId)
        } finally {
            database.close()
        }
    }

    @Test
    fun futureCampaignOutboxIsDurableButLegacyWorkerDoesNotConsumeIt() = runBlocking<Unit> {
        val database = inMemoryDatabase()
        try {
            val campaign = CampaignEntity(
                id = "campaign-1",
                ownerId = "owner-1",
                farmId = "farm-1",
                name = "2026/27",
                status = "ACTIVE",
                createdAtEpochMs = 1000L,
                updatedAtEpochMs = 1000L,
                syncState = "pending_upload",
            )
            database.fieldWriteDao().upsertCampaignWithOutbox(
                campaign,
                SyncOutboxEntity(
                    entityType = "campaign",
                    entityId = campaign.id,
                    operation = "upsert",
                    enqueuedAtEpochMs = campaign.updatedAtEpochMs,
                ),
            )

            assertEquals(1, database.syncOutboxDao().allPending().size)
            assertTrue(database.syncOutboxDao().pending(10).isEmpty())
        } finally {
            database.close()
        }
    }

    @Test
    fun canonicalRoomRepositoriesPreserveExactAreaAndSoftDelete() = runBlocking<Unit> {
        val database = inMemoryDatabase()
        try {
            val farmRepository = RoomFarmRepository(
                database.farmDao(),
                database.fieldWriteDao(),
            )
            val parcelRepository = RoomParcelRepository(
                database.plotDao(),
                database.fieldWriteDao(),
            )
            val t0 = Instant.parse("2026-09-19T07:00:00Z")
            val owner = "11111111-1111-4111-8111-111111111111"

            farmRepository.upsert(
                Farm(
                    id = "farm-1",
                    ownerId = owner,
                    name = "Finca",
                    createdAt = t0,
                    updatedAt = t0,
                ),
            )
            parcelRepository.upsert(
                Parcel(
                    id = "plot-1",
                    ownerId = owner,
                    farmId = "farm-1",
                    alias = "Norte",
                    area = Area.ofSquareMeters("12345.6789"),
                    createdAt = t0,
                    updatedAt = t0,
                ),
            )

            val parcel = parcelRepository.getById("plot-1")
            assertNotNull(parcel)
            assertEquals(
                0,
                checkNotNull(parcel?.area?.squareMeters)
                    .compareTo(BigDecimal("12345.6789")),
            )

            parcelRepository.softDelete("plot-1", t0.plusSeconds(60))
            assertNull(parcelRepository.getById("plot-1"))

            val deleteEntry = database.syncOutboxDao().findByEntity("plot", "plot-1")
            assertNotNull(deleteEntry)
            assertEquals("delete", deleteEntry?.operation)
            assertTrue(database.syncOutboxDao().pending(10).none { it.entityId == "plot-1" })
            assertNotEquals(0, database.syncOutboxDao().allPending().size)
        } finally {
            database.close()
        }
    }

    private fun inMemoryDatabase(): MaginaOlivoDatabase {
        val context: Context = InstrumentationRegistry.getInstrumentation().targetContext
        return Room.inMemoryDatabaseBuilder(
            context,
            MaginaOlivoDatabase::class.java,
        ).build()
    }
}
