package com.isivolt.maginaolivo.data.local

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "campaigns",
    indices = [
        Index("ownerId"),
        Index("farmId"),
        Index("status"),
    ],
)
data class CampaignEntity(
    @PrimaryKey val id: String,
    val ownerId: String,
    val farmId: String,
    val name: String,
    val startDateEpochDay: Long? = null,
    val endDateEpochDay: Long? = null,
    val status: String,
    val createdAtEpochMs: Long,
    val updatedAtEpochMs: Long,
    val deletedAtEpochMs: Long? = null,
    @ColumnInfo(defaultValue = "0")
    val remoteVersion: Long = 0L,
    @ColumnInfo(defaultValue = "0")
    val baseRemoteVersion: Long = 0L,
    val syncState: String,
    val lastSyncedAtEpochMs: Long? = null,
)

@Entity(
    tableName = "campaign_parcels",
    indices = [
        Index("ownerId"),
        Index("campaignId"),
        Index("parcelId"),
        Index(value = ["campaignId", "parcelId"], unique = true),
    ],
)
data class CampaignParcelEntity(
    @PrimaryKey val id: String,
    val ownerId: String,
    val campaignId: String,
    val parcelId: String,
    val createdAtEpochMs: Long,
    val updatedAtEpochMs: Long,
    val deletedAtEpochMs: Long? = null,
    @ColumnInfo(defaultValue = "0")
    val remoteVersion: Long = 0L,
    @ColumnInfo(defaultValue = "0")
    val baseRemoteVersion: Long = 0L,
    val syncState: String,
    val lastSyncedAtEpochMs: Long? = null,
)
