package com.isivolt.maginaolivo.data.local

import androidx.room.Dao
import androidx.room.Query
import androidx.room.Upsert
import kotlinx.coroutines.flow.Flow

@Dao
interface PlotDao {
    @Query("SELECT * FROM plots WHERE deletedAtEpochMs IS NULL ORDER BY name COLLATE NOCASE")
    fun observeAll(): Flow<List<PlotEntity>>

    @Query(
        """
        SELECT * FROM plots
        WHERE farmId = :farmId AND deletedAtEpochMs IS NULL
        ORDER BY name COLLATE NOCASE
        """,
    )
    fun observeByFarm(farmId: String): Flow<List<PlotEntity>>

    @Query(
        """
        SELECT * FROM plots
        WHERE cadastralReference = :reference AND deletedAtEpochMs IS NULL
        LIMIT 1
        """,
    )
    suspend fun findByCadastralReference(reference: String): PlotEntity?

    @Query("SELECT * FROM plots WHERE id = :id LIMIT 1")
    suspend fun findById(id: String): PlotEntity?

    @Query(
        """
        UPDATE plots
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
    suspend fun upsert(plot: PlotEntity)
}
