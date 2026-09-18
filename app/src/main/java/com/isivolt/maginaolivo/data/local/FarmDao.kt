package com.isivolt.maginaolivo.data.local

import androidx.room.Dao
import androidx.room.Query
import androidx.room.Upsert
import kotlinx.coroutines.flow.Flow

@Dao
interface FarmDao {
    @Query("SELECT * FROM farms ORDER BY name COLLATE NOCASE")
    fun observeAll(): Flow<List<FarmEntity>>

    @Query("SELECT * FROM farms WHERE id = :id LIMIT 1")
    suspend fun findById(id: String): FarmEntity?

    @Query("UPDATE farms SET syncState = :syncState WHERE id = :id")
    suspend fun updateSyncState(id: String, syncState: String)

    @Upsert
    suspend fun upsert(farm: FarmEntity)
}
