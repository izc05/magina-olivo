package com.isivolt.maginaolivo.data.local

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "farms",
    indices = [Index("ownerId")],
)
data class FarmEntity(
    @PrimaryKey val id: String,
    @ColumnInfo(defaultValue = "''")
    val ownerId: String = "",
    val name: String,
    val municipality: String? = null,
    val province: String? = null,
    val description: String? = null,
    val coverImageUri: String?,
    val coverDocumentId: String? = null,
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
