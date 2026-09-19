package com.isivolt.maginaolivo.data.local

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import java.util.UUID

@Dao
interface LocalProfileDao {
    @Query("SELECT * FROM local_profiles WHERE slot = 1 LIMIT 1")
    suspend fun getActive(): LocalProfileEntity?

    @Insert(onConflict = OnConflictStrategy.IGNORE)
    suspend fun insert(profile: LocalProfileEntity): Long

    @Query(
        """
        UPDATE local_profiles
        SET authUserId = :authUserId,
            mode = :mode,
            updatedAtEpochMs = :updatedAtEpochMs
        WHERE slot = 1
        """,
    )
    suspend fun updateAuthMapping(
        authUserId: String?,
        mode: String,
        updatedAtEpochMs: Long,
    )
}

class LocalIdentityRepository(
    private val dao: LocalProfileDao,
    private val clock: () -> Long = System::currentTimeMillis,
    private val idFactory: () -> String = { UUID.randomUUID().toString() },
) {
    suspend fun ensureProfile(): LocalProfileEntity {
        dao.getActive()?.let { return it }

        val now = clock()
        dao.insert(
            LocalProfileEntity(
                id = idFactory(),
                createdAtEpochMs = now,
                updatedAtEpochMs = now,
            ),
        )
        return checkNotNull(dao.getActive()) { "LOCAL_PROFILE_INIT_FAILED" }
    }

    suspend fun ownerId(): String = ensureProfile().id
}
