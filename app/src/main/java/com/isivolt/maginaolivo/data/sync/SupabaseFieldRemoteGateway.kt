package com.isivolt.maginaolivo.data.sync

import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.auth.auth
import io.github.jan.supabase.postgrest.postgrest

class SupabaseFieldRemoteGateway(
    private val client: SupabaseClient,
) : FieldRemoteGateway {

    override suspend fun upsertFarm(farm: FarmUpsertPayload) {
        ensureSession()
        client.postgrest["farms"].insert(
            value = farm,
            upsert = true,
        )
    }

    override suspend fun upsertPlot(plot: PlotUpsertPayload) {
        ensureSession()
        client.postgrest["plots"].insert(
            value = plot,
            upsert = true,
        )
    }

    private suspend fun ensureSession() {
        if (client.auth.currentSessionOrNull() == null) {
            client.auth.signInAnonymously()
        }
    }
}
