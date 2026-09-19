package com.isivolt.maginaolivo.data.local

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "local_profiles",
    indices = [Index(value = ["id"], unique = true)],
)
data class LocalProfileEntity(
    @PrimaryKey val slot: Int = 1,
    val id: String,
    val authUserId: String? = null,
    val mode: String = MODE_LOCAL,
    val createdAtEpochMs: Long,
    val updatedAtEpochMs: Long,
) {
    companion object {
        const val MODE_LOCAL = "local"
        const val MODE_AUTHENTICATED = "authenticated"
    }
}
