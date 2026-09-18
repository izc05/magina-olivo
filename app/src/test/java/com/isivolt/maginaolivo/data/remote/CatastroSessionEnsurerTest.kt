package com.isivolt.maginaolivo.data.remote

import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Test

class CatastroSessionEnsurerTest {
    @Test
    fun createsAnonymousSessionWhenMissing() = runTest {
        val auth = FakeCatastroSessionAuth(hasSession = false)
        val ensurer = CatastroSessionEnsurer(auth)

        ensurer.ensureSession()

        assertEquals(1, auth.anonymousSignInCount)
    }

    @Test
    fun reusesExistingSessionWithoutCreatingAnotherUser() = runTest {
        val auth = FakeCatastroSessionAuth(hasSession = true)
        val ensurer = CatastroSessionEnsurer(auth)

        ensurer.ensureSession()

        assertEquals(0, auth.anonymousSignInCount)
    }

    private class FakeCatastroSessionAuth(
        private var hasSession: Boolean,
    ) : CatastroSessionAuth {
        var anonymousSignInCount: Int = 0
            private set

        override suspend fun hasSession(): Boolean = hasSession

        override suspend fun signInAnonymously() {
            anonymousSignInCount += 1
            hasSession = true
        }
    }
}
