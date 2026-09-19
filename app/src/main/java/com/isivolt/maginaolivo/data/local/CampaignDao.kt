package com.isivolt.maginaolivo.data.local

import androidx.room.Dao
import androidx.room.Query
import androidx.room.Upsert
import kotlinx.coroutines.flow.Flow

@Dao
interface CampaignDao {
    @Query(
        """
        SELECT * FROM campaigns
        WHERE farmId = :farmId AND deletedAtEpochMs IS NULL
        ORDER BY startDateEpochDay DESC, createdAtEpochMs DESC
        """,
    )
    fun observeByFarm(farmId: String): Flow<List<CampaignEntity>>

    @Query("SELECT * FROM campaigns WHERE id = :id LIMIT 1")
    fun observeById(id: String): Flow<CampaignEntity?>

    @Query("SELECT * FROM campaigns WHERE id = :id LIMIT 1")
    suspend fun findById(id: String): CampaignEntity?

    @Upsert
    suspend fun upsert(entity: CampaignEntity)
}

@Dao
interface CampaignParcelDao {
    @Query(
        """
        SELECT * FROM campaign_parcels
        WHERE campaignId = :campaignId AND deletedAtEpochMs IS NULL
        ORDER BY createdAtEpochMs ASC
        """,
    )
    fun observeByCampaign(campaignId: String): Flow<List<CampaignParcelEntity>>

    @Query(
        """
        SELECT * FROM campaign_parcels
        WHERE campaignId = :campaignId
          AND parcelId = :parcelId
          AND deletedAtEpochMs IS NULL
        LIMIT 1
        """,
    )
    suspend fun findActive(
        campaignId: String,
        parcelId: String,
    ): CampaignParcelEntity?

    @Query("SELECT * FROM campaign_parcels WHERE id = :id LIMIT 1")
    suspend fun findById(id: String): CampaignParcelEntity?

    @Upsert
    suspend fun upsert(entity: CampaignParcelEntity)
}
