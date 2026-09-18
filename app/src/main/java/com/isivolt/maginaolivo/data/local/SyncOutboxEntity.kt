package com.isivolt.maginaolivo.data.local

import androidx.room.Entity
import androidx.room.Index

@Entity(
    tableName = "sync_outbox",
    primaryKeys = ["entityType", "entityId"],
    indices = [Index("enqueuedAtEpochMs")],
)
data class SyncOutboxEntity(
    val entityType: String,
    val entityId: String,
    val operation: String,
    val enqueuedAtEpochMs: Long,
    val attemptCount: Int = 0,
    val lastError: String? = null,
)
