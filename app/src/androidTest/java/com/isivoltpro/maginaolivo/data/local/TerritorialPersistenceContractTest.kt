package com.isivoltpro.maginaolivo.data.local

import android.content.Context
import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.isivoltpro.maginaolivo.core.dispatchers.DefaultAppDispatchers
import com.isivoltpro.maginaolivo.data.local.entity.CommunityWaterNoticeEntity
import com.isivoltpro.maginaolivo.data.local.entity.IrrigationCommunityEntity
import com.isivoltpro.maginaolivo.data.local.entity.PersonalIrrigationPlanEntity
import com.isivoltpro.maginaolivo.data.local.entity.TerritorialMunicipalityEntity
import com.isivoltpro.maginaolivo.data.repository.OfflineFirstTerritorialRepository
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

/** Real Room, synthetic records, isolated in-memory DB: no retained app data. */
@RunWith(AndroidJUnit4::class)
class TerritorialPersistenceContractTest {
    private lateinit var database: MaginaOlivoDatabase
    private val workspaceA = "10000000-0000-0000-0000-000000000001"
    private val workspaceB = "20000000-0000-0000-0000-000000000002"
    private val parcelA = "30000000-0000-0000-0000-000000000003"
    private val parcelB = "40000000-0000-0000-0000-000000000004"

    @Before fun prepare() {
        database = Room.inMemoryDatabaseBuilder(ApplicationProvider.getApplicationContext<Context>(), MaginaOlivoDatabase::class.java)
            .allowMainThreadQueries().build()
        for ((workspace, parcel) in listOf(workspaceA to parcelA, workspaceB to parcelB)) {
            database.openHelper.writableDatabase.execSQL("INSERT INTO workspaces (id,name,owner_user_id,country_code,timezone,locale,currency,created_at,updated_at,version,sync_status) VALUES ('$workspace','Synthetic workspace','local-owner','ES','Europe/Madrid','es-ES','EUR',100,100,1,'LOCAL_ONLY')")
            database.openHelper.writableDatabase.execSQL("INSERT INTO parcels (id,workspace_id,display_name,source,status,created_at,updated_at,version,sync_status) VALUES ('$parcel','$workspace','Synthetic parcel','MANUAL','ACTIVE',100,100,1,'LOCAL_ONLY')")
        }
    }

    @After fun close() { database.close() }

    private fun plan(workspace: String = workspaceA, parcel: String = parcelA) = PersonalIrrigationPlanEntity(
        id = "50000000-0000-0000-0000-000000000005", workspaceId = workspace, plotId = parcel,
        scheduledAtEpochMs = 1000, durationMinutes = 30, createdAtEpochMs = 100, updatedAtEpochMs = 100,
    )

    @Test fun personalPlanIdCannotOverwriteAnotherWorkspace() = runBlocking {
        val dao = database.territorialDao()
        dao.insertPersonalPlan(plan())
        val attempt = runCatching { dao.insertPersonalPlan(plan(workspaceB, parcelB)) }
        assertTrue("Plan ownership must not move through an upsert", attempt.isFailure)
        assertEquals(parcelA, dao.getPersonalPlans(workspaceA).first().single().plotId)
        assertTrue(dao.getPersonalPlans(workspaceB).first().isEmpty())
    }

    @Test fun personalPlanCannotReferenceAParcelFromAnotherWorkspace() = runBlocking {
        val attempt = runCatching { database.territorialDao().insertPersonalPlan(plan(workspaceA, parcelB)) }
        assertTrue("A private plan must refer to its own workspace's parcel", attempt.isFailure)
        assertTrue(database.territorialDao().getPersonalPlans(workspaceA).first().isEmpty())
    }

    @Test fun personalPlanUpdatePreservesCreatedTimestamp() = runBlocking {
        val dao = database.territorialDao()
        dao.insertPersonalPlan(plan())
        dao.insertPersonalPlan(plan().copy(durationMinutes = 60, createdAtEpochMs = 900, updatedAtEpochMs = 900))
        val saved = dao.getPersonalPlans(workspaceA).first().single()
        assertEquals(60, saved.durationMinutes)
        assertEquals(100L, saved.createdAtEpochMs)
        assertEquals(900L, saved.updatedAtEpochMs)
    }

    @Test fun refreshingACommunityPreservesItsOfflineNotices() = runBlocking {
        val dao = database.territorialDao()
        dao.insertMunicipalities(listOf(TerritorialMunicipalityEntity(slug = "qa-town", name = "Synthetic town", ineCode = null,
            aemetCode = "qa-code", sourceUrl = "https://example.test/fixture")))
        val community = IrrigationCommunityEntity(id = "qa-community", officialName = "Synthetic community", primaryMunicipalitySlug = "qa-town")
        dao.insertCommunities(listOf(community))
        dao.insertNotices(listOf(CommunityWaterNoticeEntity(id = "qa-notice", communityId = community.id,
            title = "Synthetic offline notice", body = "Fixture", startsAtEpochMs = 1000, endsAtEpochMs = 2000)))
        dao.insertCommunities(listOf(community.copy(shortName = "Updated name")))
        assertEquals("Synthetic offline notice", dao.getPublishedNoticesByCommunity(community.id).first().single().title)
    }

    @Test fun municipalPublicationsDoNotInventOfficialDatedNews() = runBlocking {
        val repository = OfflineFirstTerritorialRepository(database, DefaultAppDispatchers())
        assertTrue(repository.observeMunicipalPublications("bedmar-y-garciez").first().isEmpty())
        assertTrue(repository.observeMunicipalPublications("jodar").first().isEmpty())
    }
}
