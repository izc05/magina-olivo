package com.isivoltpro.maginaolivo.feature.irrigation

import com.isivoltpro.maginaolivo.core.common.AppResult
import com.isivoltpro.maginaolivo.data.local.model.FarmStatus
import com.isivoltpro.maginaolivo.domain.activity.Activity
import com.isivoltpro.maginaolivo.domain.activity.ActivityChanges
import com.isivoltpro.maginaolivo.domain.activity.ActivityParcelOption
import com.isivoltpro.maginaolivo.domain.activity.ActivityRepository
import com.isivoltpro.maginaolivo.domain.activity.AgendaEntry
import com.isivoltpro.maginaolivo.domain.machinery.MachineOption
import com.isivoltpro.maginaolivo.domain.activity.NewActivity
import com.isivoltpro.maginaolivo.domain.farm.Farm
import com.isivoltpro.maginaolivo.domain.farm.FarmChanges
import com.isivoltpro.maginaolivo.domain.farm.FarmRepository
import com.isivoltpro.maginaolivo.domain.farm.NewFarm
import com.isivoltpro.maginaolivo.domain.irrigation.AforoConfig
import com.isivoltpro.maginaolivo.domain.irrigation.FlowMeasurementMode
import com.isivoltpro.maginaolivo.domain.irrigation.InMemoryFarmerIrrigationStore
import com.isivoltpro.maginaolivo.domain.irrigation.ParcelIrrigationProfile
import com.isivoltpro.maginaolivo.domain.irrigation.PunctualTurn
import com.isivoltpro.maginaolivo.domain.irrigation.ScheduledTimeSlot
import com.isivoltpro.maginaolivo.domain.irrigation.WaterSourceType
import com.isivoltpro.maginaolivo.domain.irrigation.WaterSupplyDetails
import com.isivoltpro.maginaolivo.domain.irrigation.WaterTariff
import com.isivoltpro.maginaolivo.domain.irrigation.WaterTariffType
import com.isivoltpro.maginaolivo.domain.parcel.IrrigationSystem
import com.isivoltpro.maginaolivo.domain.parcel.NewParcel
import com.isivoltpro.maginaolivo.domain.parcel.Parcel
import com.isivoltpro.maginaolivo.domain.parcel.ParcelAgronomy
import com.isivoltpro.maginaolivo.domain.parcel.ParcelChanges
import com.isivoltpro.maginaolivo.domain.parcel.ParcelMembership
import com.isivoltpro.maginaolivo.domain.parcel.ParcelRepository
import com.isivoltpro.maginaolivo.domain.parcel.ParcelSource
import com.isivoltpro.maginaolivo.domain.parcel.RegistryLink
import java.time.DayOfWeek
import java.time.Instant
import java.time.LocalDate
import java.time.LocalTime
import java.util.UUID
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class IrrigationViewModelB5Test {

    private val testDispatcher = StandardTestDispatcher()
    private val farmId = UUID.randomUUID()

    @Before
    fun setUp() {
        Dispatchers.setMain(testDispatcher)
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    private class FakeParcelRepository(
        private val activeFlow: MutableStateFlow<List<Parcel>>,
    ) : ParcelRepository {
        override fun observeActive(farmId: UUID): Flow<List<Parcel>> = activeFlow
        override fun observeArchived(farmId: UUID): Flow<List<Parcel>> = flowOf(emptyList())
        override fun observeById(parcelId: UUID): Flow<Parcel?> = flowOf(null)
        override suspend fun findActiveByCadastralReference(workspaceId: UUID, reference: String): UUID? = null
        override suspend fun create(command: NewParcel): AppResult<UUID> = AppResult.Success(UUID.randomUUID())
        override suspend fun update(parcelId: UUID, changes: ParcelChanges): AppResult<Unit> = AppResult.Success(Unit)
        override suspend fun linkToRegistry(parcelId: UUID, link: RegistryLink): AppResult<Unit> = AppResult.Success(Unit)
        override suspend fun archive(parcelId: UUID): AppResult<Unit> = AppResult.Success(Unit)
        override suspend fun restore(parcelId: UUID, farmId: UUID): AppResult<Unit> = AppResult.Success(Unit)
        override suspend fun membershipHistory(parcelId: UUID): List<ParcelMembership> = emptyList()
    }

    private class FakeActivityRepository(
        private val farmActivitiesFlow: MutableStateFlow<List<Activity>>,
    ) : ActivityRepository {
        override fun observeForFarm(farmId: UUID): Flow<List<Activity>> = farmActivitiesFlow
        override fun observeForParcel(parcelId: UUID): Flow<List<Activity>> = flowOf(emptyList())
        override fun observe(id: UUID): Flow<Activity?> = flowOf(null)
        override fun observeAgenda(): Flow<List<AgendaEntry>> = flowOf(emptyList())
        override fun observeSelectableMachines(): Flow<List<MachineOption>> = flowOf(emptyList())
        override fun observeSelectableParcels(farmId: UUID): Flow<List<ActivityParcelOption>> = flowOf(emptyList())
        override suspend fun create(command: NewActivity): AppResult<UUID> = AppResult.Success(UUID.randomUUID())
        override suspend fun update(id: UUID, changes: ActivityChanges): AppResult<Unit> = AppResult.Success(Unit)
        override suspend fun correctCompleted(id: UUID, changes: ActivityChanges): AppResult<Unit> = AppResult.Success(Unit)
        override suspend fun plan(id: UUID): AppResult<Unit> = AppResult.Success(Unit)
        override suspend fun complete(id: UUID): AppResult<Unit> = AppResult.Success(Unit)
        override suspend fun cancel(id: UUID): AppResult<Unit> = AppResult.Success(Unit)
        override suspend fun reopen(id: UUID): AppResult<Unit> = AppResult.Success(Unit)
        override suspend fun archive(id: UUID): AppResult<Unit> = AppResult.Success(Unit)
    }

    private class FakeFarmRepository(
        private val farmFlow: MutableStateFlow<Farm?>,
    ) : FarmRepository {
        override fun observeActive(workspaceId: UUID): Flow<List<Farm>> = flowOf(emptyList())
        override fun observeArchived(workspaceId: UUID): Flow<List<Farm>> = flowOf(emptyList())
        override fun observeById(farmId: UUID): Flow<Farm?> = farmFlow
        override suspend fun create(command: NewFarm): AppResult<UUID> = AppResult.Success(UUID.randomUUID())
        override suspend fun update(farmId: UUID, changes: FarmChanges): AppResult<Unit> = AppResult.Success(Unit)
        override suspend fun archive(farmId: UUID): AppResult<Unit> = AppResult.Success(Unit)
        override suspend fun restore(farmId: UUID): AppResult<Unit> = AppResult.Success(Unit)
    }

    private fun testFarm(id: UUID, name: String) = Farm(
        id = id,
        workspaceId = UUID.randomUUID(),
        name = name,
        description = "Finca con sistema de riego",
        municipality = "Bedmar",
        province = "Jaén",
        notes = null,
        coverDocumentId = null,
        parcelCount = 1L,
        totalAreaM2 = 20000.0,
        activeCampaignName = null,
        archivedAt = null,
        version = 1L,
    )

    private fun testParcel(id: UUID, name: String, days: Set<DayOfWeek> = emptySet()) = Parcel(
        id = id,
        workspaceId = UUID.randomUUID(),
        farmId = farmId,
        displayName = name,
        cadastralReference = null,
        cadastralPolygon = null,
        cadastralParcel = null,
        municipality = null,
        province = null,
        source = ParcelSource.MANUAL,
        geometryGeoJson = null,
        cadastralAreaM2 = null,
        managedAreaM2 = null,
        notes = null,
        archivedAt = null,
        version = 1L,
        agronomy = ParcelAgronomy(
            irrigationSystem = IrrigationSystem.DRIP,
            irrigationDays = days,
            oliveTreeCount = 400,
        ),
    )

    @Test
    fun saveProfile_persistsToStoreAndUpdatesCalendarAndSummary() = runTest {
        val parcelId = UUID.randomUUID()
        val parcel = testParcel(parcelId, "El Olivar")

        val farmFlow = MutableStateFlow<Farm?>(testFarm(farmId, "Finca Sierra"))
        val parcelsFlow = MutableStateFlow(listOf(parcel))
        val activitiesFlow = MutableStateFlow<List<Activity>>(emptyList())
        val irrigationStore = InMemoryFarmerIrrigationStore()

        val viewModel = IrrigationViewModel(
            farmId = farmId,
            parcelRepository = FakeParcelRepository(parcelsFlow),
            activityRepository = FakeActivityRepository(activitiesFlow),
            farmRepository = FakeFarmRepository(farmFlow),
            farmerIrrigationStore = irrigationStore,
            today = LocalDate.of(2026, 6, 1), // Monday
        )
        advanceUntilIdle()

        val profile = ParcelIrrigationProfile(
            parcelId = parcelId,
            supply = WaterSupplyDetails(
                sourceType = WaterSourceType.IRRIGATION_COMMUNITY,
                communityName = "Comunidad San Isidro",
                sector = "Sector 1",
                hydrant = "H-05",
                intakeOrValve = "Boca 2",
            ),
            aforo = AforoConfig(
                measurementMode = FlowMeasurementMode.CALCULATED_FROM_EMITTERS,
                oliveTreeCount = 400,
                emittersPerTree = 2,
                emitterFlowLph = 4.0, // 3.2 m³/h
            ),
            weeklySlots = mapOf(
                DayOfWeek.MONDAY to ScheduledTimeSlot(
                    startTime = LocalTime.of(22, 0),
                    endTime = LocalTime.of(6, 0), // 8h = 25.6 m³
                )
            ),
            tariff = WaterTariff(
                tariffType = WaterTariffType.PER_M3,
                variablePricePerUnitMinor = 20L, // 0.20 €/m³ -> 25.6 * 20 = 512 cents
                annualCommunityQuotaMinor = 18000L, // 180.00 € cuota fija anual
            ),
        )

        viewModel.saveProfile(profile)
        advanceUntilIdle()

        val state = viewModel.state.value
        assertEquals(1, state.profiles.size)
        assertEquals("Comunidad San Isidro", state.profiles[parcelId]?.supply?.communityName)

        // Verify weekly plan projected metrics
        assertEquals(25.6, state.weeklyPlan.totalEstimatedWeeklyVolumeM3, 0.01)
        assertEquals(512L, state.weeklyPlan.totalEstimatedWeeklyCostMinor)

        // Verify summary captures annual community quota separated from variable costs
        assertEquals(1, state.summary.annualCommunityFees.size)
        assertEquals("Comunidad San Isidro", state.summary.annualCommunityFees.first().communityName)
        assertEquals(18000L, state.summary.annualCommunityFees.first().annualFixedFeeMinor)
    }

    @Test
    fun addPunctualTurnAndToggleCancellation_updatesProjectionsCorrectly() = runTest {
        val parcelId = UUID.randomUUID()
        val parcel = testParcel(parcelId, "La Solana")

        val farmFlow = MutableStateFlow<Farm?>(testFarm(farmId, "Finca Sierra"))
        val parcelsFlow = MutableStateFlow(listOf(parcel))
        val activitiesFlow = MutableStateFlow<List<Activity>>(emptyList())
        val irrigationStore = InMemoryFarmerIrrigationStore()

        val referenceMonday = LocalDate.of(2026, 6, 1)
        val viewModel = IrrigationViewModel(
            farmId = farmId,
            parcelRepository = FakeParcelRepository(parcelsFlow),
            activityRepository = FakeActivityRepository(activitiesFlow),
            farmRepository = FakeFarmRepository(farmFlow),
            farmerIrrigationStore = irrigationStore,
            today = referenceMonday,
        )
        advanceUntilIdle()

        // Set base profile with direct hydrant flow
        val profile = ParcelIrrigationProfile(
            parcelId = parcelId,
            aforo = AforoConfig(
                measurementMode = FlowMeasurementMode.DIRECT_HYDRANT_FLOW,
                directFlowRate = 10.0, // 10 m³/h
            ),
            tariff = WaterTariff(variablePricePerUnitMinor = 25L), // 0.25 €/m³
        )
        viewModel.saveProfile(profile)
        advanceUntilIdle()

        // Add extraordinary turn on Wednesday June 3 (2h: 18:00 to 20:00 -> 20 m³ -> 500 cents)
        val punctualTurnId = UUID.randomUUID()
        val punctualTurn = PunctualTurn(
            id = punctualTurnId,
            parcelId = parcelId,
            date = referenceMonday.plusDays(2),
            timeSlot = ScheduledTimeSlot(LocalTime.of(18, 0), LocalTime.of(20, 0)),
            reason = "Aporte de socorro",
        )

        viewModel.addPunctualTurn(punctualTurn)
        advanceUntilIdle()

        var state = viewModel.state.value
        assertEquals(20.0, state.weeklyPlan.totalEstimatedWeeklyVolumeM3, 0.01)
        assertEquals(500L, state.weeklyPlan.totalEstimatedWeeklyCostMinor)

        // Toggle cancellation
        viewModel.togglePunctualTurnCancellation(parcelId, punctualTurnId)
        advanceUntilIdle()

        state = viewModel.state.value
        val turnItem = state.weeklyPlan.days.first { it.dayOfWeek == DayOfWeek.WEDNESDAY }.turns.first()
        assertTrue(turnItem.isCancelled)
        assertEquals(0.0, state.weeklyPlan.totalEstimatedWeeklyVolumeM3, 0.01)
        assertEquals(0L, state.weeklyPlan.totalEstimatedWeeklyCostMinor)
    }
}
