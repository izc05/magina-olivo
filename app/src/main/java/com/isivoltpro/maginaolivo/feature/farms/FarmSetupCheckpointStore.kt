package com.isivoltpro.maginaolivo.feature.farms

import android.content.Context
import java.util.UUID

/** Local navigation receipt only. Agricultural fields remain in their existing Room repositories. */
internal class FarmSetupCheckpointStore(context: Context) {
    private val preferences = context.applicationContext.getSharedPreferences("farm_setup_checkpoint_v1", Context.MODE_PRIVATE)

    private fun key(workspaceId: UUID, ownerId: UUID?) = "${ownerId ?: "local"}:$workspaceId"

    fun load(workspaceId: UUID, ownerId: UUID?): UUID? =
        preferences.getString(key(workspaceId, ownerId), null)?.let { runCatching { UUID.fromString(it) }.getOrNull() }

    /** Must be durable before FarmRepository.create is called. */
    @Synchronized fun reserve(workspaceId: UUID, ownerId: UUID?): UUID? {
        load(workspaceId, ownerId)?.let { return it }
        val id = UUID.randomUUID()
        return id.takeIf { preferences.edit().putString(key(workspaceId, ownerId), it.toString()).commit() }
    }

    fun clear(workspaceId: UUID, ownerId: UUID?): Boolean =
        preferences.edit().remove(key(workspaceId, ownerId)).commit()
}
