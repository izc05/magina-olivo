package com.isivolt.maginaolivo.data.local

import androidx.room.Dao
import androidx.room.Query
import androidx.room.Upsert
import kotlinx.coroutines.flow.Flow

@Dao
interface PlotDao {
    @Query("SELECT * FROM plots WHERE farmId = :farmId ORDER BY name COLLATE NOCASE")
    fun observeByFarm(farmId: String): Flow<List<PlotEntity>>

    @Query("SELECT * FROM plots WHERE cadastralReference = :reference LIMIT 1")
    suspend fun findByCadastralReference(reference: String): PlotEntity?

    @Upsert
    suspend fun upsert(plot: PlotEntity)
}
