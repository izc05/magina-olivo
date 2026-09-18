package com.isivolt.maginaolivo.data.local

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "plots",
    indices = [
        Index("farmId"),
        Index(value = ["cadastralReference"], unique = true),
    ],
)
data class PlotEntity(
    @PrimaryKey val id: String,
    val farmId: String,
    val name: String,
    val cadastralReference: String?,
    val areaHa: Double?,
    val boundaryGeoJson: String?,
    val boundarySource: String?,
    val updatedAtEpochMs: Long,
    val syncState: String,
)
