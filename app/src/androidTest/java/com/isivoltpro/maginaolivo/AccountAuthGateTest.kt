package com.isivoltpro.maginaolivo

import android.content.Context
import androidx.activity.ComponentActivity
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.systemBarsPadding
import androidx.compose.material3.Text
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.v2.createAndroidComposeRule
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import com.isivoltpro.maginaolivo.app.AndroidOnboardingStateStore
import com.isivoltpro.maginaolivo.app.AppCompositionRoot
import com.isivoltpro.maginaolivo.app.AppearanceMode
import com.isivoltpro.maginaolivo.core.common.AppResult
import com.isivoltpro.maginaolivo.domain.farm.NewFarm
import com.isivoltpro.maginaolivo.feature.account.*
import com.isivoltpro.maginaolivo.navigation.AppNavigation
import com.isivoltpro.maginaolivo.ui.theme.MaginaOlivoTheme
import java.time.Instant
import java.util.UUID
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.runBlocking
import org.junit.Assert.*
import org.junit.Rule
import org.junit.Test
import org.junit.rules.RuleChain
import org.junit.rules.TestRule
import org.junit.runner.RunWith
import org.junit.runners.model.Statement

/**
 * Android instrumented tests for Mandatory Access (Auth Gate) 1.0.
 *
 * Verifies:
 * 1. First launch without session: displays Iniciar sesión and Crear cuenta, agricultural shell blocked.
 * 2. Restart with saved session: opens directly into the app without prompting for password.
 * 3. Offline / airplane mode: allows access with verified saved session in offline mode.
 * 4. Logout: returns to access gate immediately, blocks agricultural shell, preserves local data.
 * 5. Account switch A -> B: switches identity cleanly, no data/ViewModel leakage, no auto-linking.
 */
@RunWith(AndroidJUnit4::class)
class AccountAuthGateTest {
    private val compose = createAndroidComposeRule<ComponentActivity>()
    private val context = ApplicationProvider.getApplicationContext<Context>()

    private val userA = UUID.fromString("00000000-0000-0000-0000-000000000001")
    private val userB = UUID.fromString("00000000-0000-0000-0000-000000000002")

    private val guard = TestRule { base, _ ->
        object : Statement() {
            override fun evaluate() {
                assertEquals("com.isivoltpro.maginaolivo.dev", context.packageName)
                android.os.ParcelFileDescriptor.AutoCloseInputStream(
                    InstrumentationRegistry.getInstrumentation().uiAutomation.executeShellCommand("getprop ro.kernel.qemu")
                ).bufferedReader().use { assertEquals("1", it.readText().trim()) }
                base.evaluate()
            }
        }
    }

    @get:Rule
    val rules: TestRule = RuleChain.outerRule(guard).around(IsolatedAppStateRule()).around(compose)

    private inner class TestAuthApi : AccountAuthApi {
        override val simulated: Boolean = true
        override val redirectUri: String = "com.isivoltpro.maginaolivo.dev://auth/callback"

        private fun makeSession(userId: UUID, email: String) =
            AuthSession(userId, email, "synthetic-access", "synthetic-refresh", Instant.now().plusSeconds(3600))

        override suspend fun signIn(email: String, password: String): AuthSession {
            if (password == "incorrecta") throw AuthFailure(AuthFailure.Kind.CREDENTIALS)
            val id = if (email.startsWith("b")) userB else userA
            return makeSession(id, email)
        }

        override suspend fun signUp(email: String, password: String, challenge: String): AuthSession? = null
        override suspend fun recover(email: String, challenge: String) {}
        override suspend fun exchange(code: String, verifier: String): AuthSession = makeSession(userA, "a@example.com")
        override suspend fun refresh(session: AuthSession): AuthSession = session
        override suspend fun user(session: AuthSession): Pair<UUID, String> = session.userId to session.email
        override suspend fun changePassword(session: AuthSession, password: String) {}
        override suspend fun signOut(session: AuthSession) {}
    }

    private fun renderGate(
        repository: AccountRepository,
        root: AppCompositionRoot,
        contentTag: String = "agricultural-content"
    ) {
        compose.setContent {
            MaginaOlivoTheme(AppearanceMode.DARK) {
                Box(Modifier.fillMaxSize().systemBarsPadding()) {
                    AuthGateHost(
                        accountRepository = repository,
                        farmLinks = root.farmLinks,
                        simulationAllowed = true
                    ) {
                        Box(Modifier.fillMaxSize().testTag(contentTag)) {
                            Text("Contenido agrícola protegido", Modifier.testTag("protected-label"))
                        }
                    }
                }
            }
        }
    }

    @Test
    fun firstLaunchShowsLoginAndRegisterAndBlocksAgriculturalContent() {
        val store = MemoryAccountSessionStore()
        val repo = AccountRepository(TestAuthApi(), store)
        val root = AppCompositionRoot.createAndroid(context, "DEV")

        renderGate(repo, root)

        // Auth gate is displayed
        waitFor("auth-gate-root")
        compose.onNodeWithTag("auth-gate-root").assertIsDisplayed()
        compose.onNodeWithTag("account-login").assertIsDisplayed() // "Iniciar sesión"
        compose.onNodeWithTag("account-mode-register").assertIsDisplayed() // "Crear cuenta"

        // Agricultural content must NOT exist
        compose.onNodeWithTag("agricultural-content").assertDoesNotExist()
        compose.onNodeWithTag("protected-label").assertDoesNotExist()
    }

    @Test
    fun restartWithSavedSessionRestoresDirectAccessWithoutPassword() = runBlocking {
        val store = MemoryAccountSessionStore()
        val sessionA = AuthSession(userA, "a@example.com", "access", "refresh", Instant.now().plusSeconds(3600))
        store.write(AccountRecord(session = sessionA))

        val repo = AccountRepository(TestAuthApi(), store)
        repo.resume(online = true)
        val root = AppCompositionRoot.createAndroid(context, "DEV")

        renderGate(repo, root)

        // Immediately grants access to agricultural content
        waitFor("agricultural-content")
        compose.onNodeWithTag("agricultural-content").assertIsDisplayed()
        compose.onNodeWithTag("protected-label").assertIsDisplayed()

        // Auth gate and password prompt must not be shown
        compose.onNodeWithTag("auth-gate-root").assertDoesNotExist()
        compose.onNodeWithTag("account-password").assertDoesNotExist()
    }

    @Test
    fun airplaneModeWithSavedSessionAllowsDirectAccessToLocalData() = runBlocking {
        val store = MemoryAccountSessionStore()
        val sessionA = AuthSession(userA, "a@example.com", "access", "refresh", Instant.now().plusSeconds(3600))
        store.write(AccountRecord(session = sessionA))

        val repo = AccountRepository(TestAuthApi(), store)
        // Simulate offline resume (airplane mode)
        repo.resume(online = false)
        assertEquals(AccountStatus.OFFLINE, repo.state.value.status)

        val root = AppCompositionRoot.createAndroid(context, "DEV")
        renderGate(repo, root)

        // Directly enters into protected content in offline mode
        waitFor("agricultural-content")
        compose.onNodeWithTag("agricultural-content").assertIsDisplayed()
        compose.onNodeWithTag("auth-gate-root").assertDoesNotExist()
    }

    @Test
    fun logoutReturnsToGateAndProtectsLocalDataWithoutDeletingIt() = runBlocking {
        val store = MemoryAccountSessionStore()
        val sessionA = AuthSession(userA, "a@example.com", "access", "refresh", Instant.now().plusSeconds(3600))
        store.write(AccountRecord(session = sessionA))

        val root = AppCompositionRoot.createAndroid(context, "DEV")
        val local = checkNotNull(root.localPersistence)
        val workspace = (local.workspaceRepository.ensureLocalWorkspace() as AppResult.Success).value
        val farm = (local.farmRepository.create(NewFarm(workspace, "Finca local preservada")) as AppResult.Success).value

        val repo = AccountRepository(TestAuthApi(), store)
        repo.resume(online = true)

        renderGate(repo, root)
        waitFor("agricultural-content")

        // Perform logout
        repo.logout(online = true)

        // Screen immediately switches to Auth Gate
        waitFor("auth-gate-root")
        compose.onNodeWithTag("auth-gate-root").assertIsDisplayed()
        compose.onNodeWithTag("account-login").assertIsDisplayed()
        compose.onNodeWithTag("agricultural-content").assertDoesNotExist()

        // Verify local data is completely preserved
        assertNotNull(local.database.farmDao().findById(farm))
        assertNull(store.read().session)
    }

    @Test
    fun accountSwitchFromAToBReplacesIdentityWithoutLeakage() = runBlocking {
        val store = MemoryAccountSessionStore()
        val sessionA = AuthSession(userA, "user_a@example.com", "access-a", "refresh-a", Instant.now().plusSeconds(3600))
        store.write(AccountRecord(session = sessionA))

        val repo = AccountRepository(TestAuthApi(), store)
        repo.resume(online = true)
        val root = AppCompositionRoot.createAndroid(context, "DEV")

        renderGate(repo, root)
        waitFor("agricultural-content")
        assertEquals(userA, repo.state.value.userId)

        // User A logs out
        repo.logout(online = true)
        waitFor("auth-gate-root")

        // User B logs in via UI
        compose.onNodeWithTag("account-email").performScrollTo().performTextReplacement("b_user@example.com")
        compose.onNodeWithTag("account-password").performScrollTo().performTextReplacement("passwordB42")
        compose.onNodeWithTag("account-login").performScrollTo().performClick()

        // Content reopens for User B
        waitFor("agricultural-content")
        compose.onNodeWithTag("agricultural-content").assertIsDisplayed()
        assertEquals(userB, repo.state.value.userId)
        assertEquals("b_user@example.com", repo.state.value.email)
        assertEquals(userB, store.read().session?.userId)
    }

    private fun waitFor(tag: String) =
        compose.waitUntil(15_000) { compose.onAllNodesWithTag(tag).fetchSemanticsNodes().isNotEmpty() }
}
