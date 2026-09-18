package com.isivolt.maginaolivo.data.local

import androidx.room.Dao
import androidx.room.Query

@Dao
interface SyncOutboxDao {
    @Query(
        """
        SELECT * FROM sync_outbox
        WHERE entityType = :entityType AND entityId = :entityId
        LIMIT 1
        """,
    )
    suspend fun findByEntity(
        entityType: String,
        entityId: String,
    ): SyncOutboxEntity?

    @Query(
        """
        SELECT * FROM sync_outbox
        ORDER BY
            CASE entityType
                WHEN 'farm' THEN 0
                WHEN 'plot' THEN 1
                ELSE 2
            END ASC,
            enqueuedAtEpochMs ASC,
            entityId ASC
        LIMIT :limit
        """,
    )
    suspend fun pending(limit: Int): List<SyncOutboxEntity>

    @Query(
        """
        DELETE FROM sync_outbox
        WHERE entityType = :entityType AND entityId = :entityId
        """,
    )
    suspend fun delete(
        entityType: String,
        entityId: String,
    )

    @Query(
        """
        UPDATE sync_outbox
        SET attemptCount = attemptCount + 1,
            lastError = :message
        WHERE entityType = :entityType AND entityId = :entityId
        """,
    )
    suspend fun markFailed(
        entityType: String,
        entityId: String,
        message: String,
    )
}
