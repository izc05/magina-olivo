package com.isivolt.maginaolivo.data.local

import androidx.room.Dao
import androidx.room.Query
import androidx.room.Upsert
import kotlinx.coroutines.flow.Flow

@Dao
interface FarmDao {
    @Query("SELECT * FROM farms ORDER BY name COLLATE NOCASE")
    fun observeAll(): Flow<List<FarmEntity>>

    @Upsert
    suspend fun upsert(farm: FarmEntity)
}
