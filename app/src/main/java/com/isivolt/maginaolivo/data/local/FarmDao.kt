package com.isivolt.maginaolivo.data.local

import androidx.room.Dao
import androidx.room.Query
import androidx.room.Upsert
import kotlinx.coroutines.flow.Flow

@Dao
interface FarmDao {
    @Query("SELECT * FROM farms WHERE deletedAtEpochMs IS NULL ORDER BY name COLLATE NOCASE")
    fun observeAll(): Flow<List<FarmEntity>>

    @Query("SELECT * FROM farms WHERE id = :id LIMIT 1")
    suspend fun findById(id: String): FarmEntity?

    @Query(
        """
        UPDATE farms
        SET syncState = :syncState,
            lastSyncedAtEpochMs = :lastSyncedAtEpochMs
        WHERE id = :id
        """,
    )
    suspend fun updateSyncState(
        id: String,
        syncState: String,
        lastSyncedAtEpochMs: Long? = null,
    )

    @Upsert
    suspend fun upsert(farm: FarmEntity)
}
