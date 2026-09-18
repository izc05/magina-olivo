package com.isivolt.maginaolivo.data.remote

import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.auth.auth

interface CatastroSessionAuth {
    suspend fun hasSession(): Boolean
    suspend fun signInAnonymously()
}

class CatastroSessionEnsurer(
    private val auth: CatastroSessionAuth,
) {
    suspend fun ensureSession() {
        if (!auth.hasSession()) {
            auth.signInAnonymously()
        }
    }
}

class SupabaseCatastroSessionAuth(
    private val client: SupabaseClient,
) : CatastroSessionAuth {
    override suspend fun hasSession(): Boolean =
        client.auth.currentSessionOrNull() != null

    override suspend fun signInAnonymously() {
        client.auth.signInAnonymously()
    }
}
