package com.isivolt.maginaolivo.domain.core

import java.time.Instant
import kotlinx.coroutines.flow.Flow

interface FarmRepository {
    fun observeByOwner(ownerId: String): Flow<List<Farm>>
    fun observeById(id: String): Flow<Farm?>
    suspend fun getById(id: String): Farm?
    suspend fun upsert(farm: Farm)
    suspend fun softDelete(id: String, deletedAt: Instant)
}

interface ParcelRepository {
    fun observeByFarm(farmId: String): Flow<List<Parcel>>
    fun observeById(id: String): Flow<Parcel?>
    suspend fun getById(id: String): Parcel?
    suspend fun upsert(parcel: Parcel)
    suspend fun softDelete(id: String, deletedAt: Instant)
}

interface CampaignRepository {
    fun observeByFarm(farmId: String): Flow<List<Campaign>>
    fun observeById(id: String): Flow<Campaign?>
    suspend fun getById(id: String): Campaign?
    suspend fun upsert(campaign: Campaign)
    suspend fun softDelete(id: String, deletedAt: Instant)
}

interface CampaignParcelRepository {
    fun observeByCampaign(campaignId: String): Flow<List<CampaignParcel>>
    suspend fun get(campaignId: String, parcelId: String): CampaignParcel?
    suspend fun upsert(link: CampaignParcel)
    suspend fun softDelete(id: String, deletedAt: Instant)
}
