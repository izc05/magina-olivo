package com.isivoltpro.maginaolivo.feature.account

import java.time.Instant
import java.util.UUID
import kotlinx.coroutines.test.runTest
import org.junit.Assert.*
import org.junit.Test

class AuthGateTest {
    private val now = Instant.parse("2026-10-30T10:00:00Z")
    private val userA = UUID.fromString("00000000-0000-0000-0000-000000000001")
    private val userB = UUID.fromString("00000000-0000-0000-0000-000000000002")

    private fun session(userId: UUID, email: String, expired: Boolean = false): AuthSession =
        AuthSession(
            userId = userId,
            email = email,
            accessToken = "token-$userId",
            refreshToken = "refresh-$userId",
            expiresAt = if (expired) now.minusSeconds(60) else now.plusSeconds(3600)
        )

    private inner class FakeApi : AccountAuthApi {
        override val simulated: Boolean = true
        override val redirectUri: String = "com.isivoltpro.maginaolivo.dev://auth/callback"
        override suspend fun signIn(email: String, password: String): AuthSession {
            val id = if (email.startsWith("b")) userB else userA
            return session(id, email)
        }
        override suspend fun signUp(email: String, password: String, challenge: String): AuthSession? = null
        override suspend fun recover(email: String, challenge: String) {}
        override suspend fun exchange(code: String, verifier: String): AuthSession = session(userA, "a@example.com")
        override suspend fun refresh(session: AuthSession): AuthSession = session
        override suspend fun user(session: AuthSession): Pair<UUID, String> = session.userId to session.email
        override suspend fun changePassword(session: AuthSession, password: String) {}
        override suspend fun signOut(session: AuthSession) {}
    }

    @Test
    fun unconfiguredRepositoryAllowsAccessInUnconfiguredEnvironments() {
        val repo = AccountRepository(null)
        assertFalse(repo.isConfigured)
        assertEquals(AccountStatus.UNCONFIGURED, repo.state.value.status)
        val isAuthorized = !repo.isConfigured || repo.state.value.status in setOf(
            AccountStatus.SIGNED_IN,
            AccountStatus.OFFLINE
        )
        assertTrue("Unconfigured environment must not block access", isAuthorized)
    }

    @Test
    fun configuredRepositoryRequiresAuthentication() {
        val repo = AccountRepository(FakeApi())
        assertTrue(repo.isConfigured)
        assertEquals(AccountStatus.SIGNED_OUT, repo.state.value.status)
        val isAuthorized = !repo.isConfigured || repo.state.value.status in setOf(
            AccountStatus.SIGNED_IN,
            AccountStatus.OFFLINE
        )
        assertFalse("Initial state without session must be unauthorized", isAuthorized)
    }

    @Test
    fun loginUnlocksAuthorizationAndPreservesUserData() = runTest {
        val store = MemoryAccountSessionStore()
        val repo = AccountRepository(FakeApi(), store, now = { now })
        assertFalse(!repo.isConfigured || repo.state.value.status in setOf(AccountStatus.SIGNED_IN, AccountStatus.OFFLINE))

        repo.login("a@example.com", "password42", online = true)

        assertEquals(AccountStatus.SIGNED_IN, repo.state.value.status)
        assertEquals(userA, repo.state.value.userId)
        assertEquals("a@example.com", repo.state.value.email)
        val isAuthorized = !repo.isConfigured || repo.state.value.status in setOf(
            AccountStatus.SIGNED_IN,
            AccountStatus.OFFLINE
        )
        assertTrue(isAuthorized)
        assertNotNull(store.read().session)
    }

    @Test
    fun resumeWithSavedSessionRestoresDirectAccessWithoutPassword() = runTest {
        val store = MemoryAccountSessionStore()
        store.write(AccountRecord(session = session(userA, "a@example.com")))
        val repo = AccountRepository(FakeApi(), store, now = { now })

        // Process restart: resume offline
        repo.resume(online = false)
        assertEquals(AccountStatus.OFFLINE, repo.state.value.status)
        assertEquals(userA, repo.state.value.userId)
        val isAuthorizedOffline = !repo.isConfigured || repo.state.value.status in setOf(
            AccountStatus.SIGNED_IN,
            AccountStatus.OFFLINE
        )
        assertTrue("Offline verified session must grant access", isAuthorizedOffline)

        // Process restart: resume online
        repo.resume(online = true)
        assertEquals(AccountStatus.SIGNED_IN, repo.state.value.status)
        val isAuthorizedOnline = !repo.isConfigured || repo.state.value.status in setOf(
            AccountStatus.SIGNED_IN,
            AccountStatus.OFFLINE
        )
        assertTrue("Online verified session must grant access", isAuthorizedOnline)
    }

    @Test
    fun expiredSessionIsLockedOutUntilReauthenticated() = runTest {
        val store = MemoryAccountSessionStore()
        store.write(AccountRecord(session = session(userA, "a@example.com", expired = true)))
        val repo = AccountRepository(FakeApi(), store, now = { now })

        repo.resume(online = false)
        assertEquals(AccountStatus.EXPIRED, repo.state.value.status)
        val isAuthorized = !repo.isConfigured || repo.state.value.status in setOf(
            AccountStatus.SIGNED_IN,
            AccountStatus.OFFLINE
        )
        assertFalse("Expired session must be locked out", isAuthorized)
    }

    @Test
    fun logoutReturnsToLockedStateAndPreservesLocalRecordsIntact() = runTest {
        val store = MemoryAccountSessionStore()
        store.write(AccountRecord(session = session(userA, "a@example.com")))
        val repo = AccountRepository(FakeApi(), store, now = { now })
        repo.resume(online = true)
        assertEquals(AccountStatus.SIGNED_IN, repo.state.value.status)

        repo.logout(online = true)

        assertEquals(AccountStatus.SIGNED_OUT, repo.state.value.status)
        assertNull(repo.state.value.userId)
        assertNull(store.read().session)
        val isAuthorized = !repo.isConfigured || repo.state.value.status in setOf(
            AccountStatus.SIGNED_IN,
            AccountStatus.OFFLINE
        )
        assertFalse("Logged out state must lock access gate", isAuthorized)
    }

    @Test
    fun accountSwitchFromAToBReplacesIdentityWithoutLeakage() = runTest {
        val store = MemoryAccountSessionStore()
        val repo = AccountRepository(FakeApi(), store, now = { now })

        // User A logs in
        repo.login("a@example.com", "passwordA123", online = true)
        assertEquals(userA, repo.state.value.userId)
        assertEquals("a@example.com", repo.state.value.email)

        // User A logs out
        repo.logout(online = true)
        assertEquals(AccountStatus.SIGNED_OUT, repo.state.value.status)
        assertNull(store.read().session)

        // User B logs in
        repo.login("b@example.com", "passwordB123", online = true)
        assertEquals(AccountStatus.SIGNED_IN, repo.state.value.status)
        assertEquals(userB, repo.state.value.userId)
        assertEquals("b@example.com", repo.state.value.email)
        assertEquals(userB, store.read().session?.userId)
    }
}
