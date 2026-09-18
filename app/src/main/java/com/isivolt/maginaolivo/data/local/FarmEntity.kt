package com.isivolt.maginaolivo.data.local

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "farms")
data class FarmEntity(
    @PrimaryKey val id: String,
    val name: String,
    val coverImageUri: String?,
    val updatedAtEpochMs: Long,
    val syncState: String,
)
