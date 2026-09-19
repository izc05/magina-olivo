package com.isivolt.maginaolivo.domain.core

import java.math.BigDecimal
import java.time.Instant
import java.time.LocalDate
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class DomainCoreTest {
    private val owner = "11111111-1111-1111-1111-111111111111"
    private val instant = Instant.parse("2026-09-19T10:00:00Z")

    @Test
    fun `D1-01 create valid farm`() = runBlocking {
        val farms = FakeFarmRepository()
        val result = CreateFarm(farms, { "farm-1" }, { instant })(owner, "  Cortijo Alto  ")
        assertTrue(result is DomainResult.Success)
        assertEquals("Cortijo Alto", (result as DomainResult.Success).value.name)
    }

    @Test
    fun `D1-02 reject empty farm name`() = runBlocking {
        val result = CreateFarm(FakeFarmRepository())(owner, "   ")
        assertEquals(DomainError.InvalidFarmName, (result as DomainResult.Failure).error)
    }

    @Test
    fun `D1-03 create valid parcel`() = runBlocking {
        val farms = FakeFarmRepository().apply { upsert(farm("farm-1", owner)) }
        val parcels = FakeParcelRepository()
        val result = CreateParcel(farms, parcels, { "parcel-1" }, { instant })(owner, "farm-1", "A")
        assertTrue(result is DomainResult.Success)
        assertEquals("farm-1", (result as DomainResult.Success).value.farmId)
    }

    @Test
    fun `D1-04 reject empty parcel alias`() = runBlocking {
        val farms = FakeFarmRepository().apply { upsert(farm("farm-1", owner)) }
        val result = CreateParcel(farms, FakeParcelRepository())(owner, "farm-1", " ")
        assertEquals(DomainError.InvalidParcelAlias, (result as DomainResult.Failure).error)
    }

    @Test(expected = IllegalArgumentException::class)
    fun `D1-05 reject negative area`() {
        Area.ofHectares("-0.01")
    }

    @Test
    fun `D1-06 create valid campaign`() = runBlocking {
        val farms = FakeFarmRepository().apply { upsert(farm("farm-1", owner)) }
        val campaigns = FakeCampaignRepository()
        val result = CreateCampaign(campaigns = campaigns, farms = farms, idFactory = { "campaign-1" }, now = { instant })(
            ownerId = owner,
            farmId = "farm-1",
            name = "2026/27",
            startDate = LocalDate.of(2026, 10, 1),
        )
        assertTrue(result is DomainResult.Success)
    }

    @Test
    fun `D1-06b reject empty campaign name`() = runBlocking {
        val farms = FakeFarmRepository().apply { upsert(farm("farm-1", owner)) }
        val result = CreateCampaign(farms, FakeCampaignRepository())(
            owner,
            "farm-1",
            "   ",
        )
        assertEquals(DomainError.InvalidCampaignName, (result as DomainResult.Failure).error)
    }

    @Test
    fun `D1-07 reject campaign end before start`() = runBlocking {
        val farms = FakeFarmRepository().apply { upsert(farm("farm-1", owner)) }
        val result = CreateCampaign(farms, FakeCampaignRepository())(
            owner,
            "farm-1",
            "2026/27",
            LocalDate.of(2026, 10, 1),
            LocalDate.of(2026, 9, 30),
        )
        assertEquals(DomainError.InvalidDateRange, (result as DomainResult.Failure).error)
    }

    @Test
    fun `D1-08 one campaign accepts several parcels from same farm`() = runBlocking {
        val parcels = FakeParcelRepository()
        parcels.upsert(parcel("p1", owner, "farm-1"))
        parcels.upsert(parcel("p2", owner, "farm-1"))
        parcels.upsert(parcel("p3", owner, "farm-1"))
        val campaigns = FakeCampaignRepository().apply { upsert(campaign("c1", owner, "farm-1")) }
        val links = FakeCampaignParcelRepository()
        val useCase = AddParcelToCampaign(parcels, campaigns, links, now = { instant })
        useCase(owner, "c1", "p1")
        useCase(owner, "c1", "p2")
        useCase(owner, "c1", "p3")
        assertEquals(3, links.current.size)
    }

    @Test
    fun `D1-09 reject parcel from another farm`() = runBlocking {
        val parcels = FakeParcelRepository().apply { upsert(parcel("p1", owner, "farm-2")) }
        val campaigns = FakeCampaignRepository().apply { upsert(campaign("c1", owner, "farm-1")) }
        val result = AddParcelToCampaign(parcels, campaigns, FakeCampaignParcelRepository())(owner, "c1", "p1")
        assertEquals(DomainError.ParcelBelongsToDifferentFarm, (result as DomainResult.Failure).error)
    }

    @Test
    fun `D1-10 money is exact in cents`() {
        val total = Money(1027) + Money(20) - Money(20)
        assertEquals(1027L, total.cents)
    }

    @Test
    fun `D1-11 one hectare equals ten thousand square meters`() {
        val area = Area.ofHectares("1")
        assertEquals(0, area.squareMeters.compareTo(BigDecimal("10000")))
        assertEquals(0, area.hectares.compareTo(BigDecimal.ONE))
    }

    @Test
    fun `D1-12 weight preserves decimal precision`() {
        val total = Weight.ofKilograms("0.1") + Weight.ofKilograms("0.2")
        assertEquals(0, total.kilograms.compareTo(BigDecimal("0.3")))
    }

    @Test
    fun `D1-13 closing campaign keeps parcel history`() = runBlocking {
        val campaigns = FakeCampaignRepository().apply { upsert(campaign("c1", owner, "farm-1")) }
        val links = FakeCampaignParcelRepository().apply {
            upsert(CampaignParcel("cp1", owner, "c1", "p1", instant, instant))
        }
        val result = CloseCampaign(campaigns, { instant.plusSeconds(60) })("c1", LocalDate.of(2027, 9, 30))
        assertEquals(CampaignStatus.CLOSED, (result as DomainResult.Success).value.status)
        assertEquals(1, links.current.size)
    }

    private fun farm(id: String, ownerId: String) =
        Farm(id, ownerId, "Finca", createdAt = instant, updatedAt = instant)

    private fun parcel(id: String, ownerId: String, farmId: String) =
        Parcel(id, ownerId, farmId, "Parcela", createdAt = instant, updatedAt = instant)

    private fun campaign(id: String, ownerId: String, farmId: String) =
        Campaign(id, ownerId, farmId, "2026/27", createdAt = instant, updatedAt = instant)
}

private class FakeFarmRepository : FarmRepository {
    private val state = MutableStateFlow<List<Farm>>(emptyList())
    override fun observeByOwner(ownerId: String): Flow<List<Farm>> =
        state.map { rows -> rows.filter { it.ownerId == ownerId && it.deletedAt == null } }
    override fun observeById(id: String): Flow<Farm?> =
        state.map { rows -> rows.firstOrNull { it.id == id && it.deletedAt == null } }
    override suspend fun getById(id: String): Farm? =
        state.value.firstOrNull { it.id == id && it.deletedAt == null }
    override suspend fun upsert(farm: Farm) {
        state.value = state.value.filterNot { it.id == farm.id } + farm
    }
    override suspend fun softDelete(id: String, deletedAt: Instant) {
        getById(id)?.let { upsert(it.copy(deletedAt = deletedAt, updatedAt = deletedAt)) }
    }
}

private class FakeParcelRepository : ParcelRepository {
    private val state = MutableStateFlow<List<Parcel>>(emptyList())
    override fun observeByFarm(farmId: String): Flow<List<Parcel>> =
        state.map { rows -> rows.filter { it.farmId == farmId && it.deletedAt == null } }
    override fun observeById(id: String): Flow<Parcel?> =
        state.map { rows -> rows.firstOrNull { it.id == id && it.deletedAt == null } }
    override suspend fun getById(id: String): Parcel? =
        state.value.firstOrNull { it.id == id && it.deletedAt == null }
    override suspend fun upsert(parcel: Parcel) {
        state.value = state.value.filterNot { it.id == parcel.id } + parcel
    }
    override suspend fun softDelete(id: String, deletedAt: Instant) {
        getById(id)?.let { upsert(it.copy(deletedAt = deletedAt, updatedAt = deletedAt)) }
    }
}

private class FakeCampaignRepository : CampaignRepository {
    private val state = MutableStateFlow<List<Campaign>>(emptyList())
    override fun observeByFarm(farmId: String): Flow<List<Campaign>> =
        state.map { rows -> rows.filter { it.farmId == farmId && it.deletedAt == null } }
    override fun observeById(id: String): Flow<Campaign?> =
        state.map { rows -> rows.firstOrNull { it.id == id && it.deletedAt == null } }
    override suspend fun getById(id: String): Campaign? =
        state.value.firstOrNull { it.id == id && it.deletedAt == null }
    override suspend fun upsert(campaign: Campaign) {
        state.value = state.value.filterNot { it.id == campaign.id } + campaign
    }
    override suspend fun softDelete(id: String, deletedAt: Instant) {
        getById(id)?.let { upsert(it.copy(deletedAt = deletedAt, updatedAt = deletedAt)) }
    }
}

private class FakeCampaignParcelRepository : CampaignParcelRepository {
    private val state = MutableStateFlow<List<CampaignParcel>>(emptyList())
    val current: List<CampaignParcel> get() = state.value.filter { it.deletedAt == null }
    override fun observeByCampaign(campaignId: String): Flow<List<CampaignParcel>> =
        state.map { rows -> rows.filter { it.campaignId == campaignId && it.deletedAt == null } }
    override suspend fun get(campaignId: String, parcelId: String): CampaignParcel? =
        current.firstOrNull { it.campaignId == campaignId && it.parcelId == parcelId }
    override suspend fun upsert(link: CampaignParcel) {
        state.value = state.value.filterNot { it.id == link.id } + link
    }
    override suspend fun softDelete(id: String, deletedAt: Instant) {
        state.value.firstOrNull { it.id == id }?.let {
            upsert(it.copy(deletedAt = deletedAt, updatedAt = deletedAt))
        }
    }
}
