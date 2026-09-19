package com.isivolt.maginaolivo.data.local

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "plots",
    indices = [
        Index("ownerId"),
        Index("farmId"),
        Index(value = ["ownerId", "cadastralReference"], unique = true),
    ],
)
data class PlotEntity(
    @PrimaryKey val id: String,
    @ColumnInfo(defaultValue = "''")
    val ownerId: String = "",
    val farmId: String,
    val name: String,
    val cadastralReference: String?,
    val areaHa: Double?,
    val areaSquareMetersDecimal: String? = null,
    val oliveTreeCount: Int? = null,
    val mainVariety: String? = null,
    val boundaryGeoJson: String?,
    val boundarySource: String?,
    @ColumnInfo(defaultValue = "0")
    val createdAtEpochMs: Long = 0L,
    val updatedAtEpochMs: Long,
    val deletedAtEpochMs: Long? = null,
    @ColumnInfo(defaultValue = "0")
    val remoteVersion: Long = 0L,
    @ColumnInfo(defaultValue = "0")
    val baseRemoteVersion: Long = 0L,
    val syncState: String,
    val lastSyncedAtEpochMs: Long? = null,
)
