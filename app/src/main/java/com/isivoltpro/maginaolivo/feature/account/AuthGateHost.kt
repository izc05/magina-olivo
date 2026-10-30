package com.isivoltpro.maginaolivo.feature.account

import android.app.NotificationManager
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.isivoltpro.maginaolivo.data.reminder.ReminderNotifier
import com.isivoltpro.maginaolivo.data.repository.LocalFarmLinkRepository
import com.isivoltpro.maginaolivo.ui.theme.MoSurfaceTokens

/**
 * Mandatory Access Gate for Mágina Olivo 1.0.
 *
 * Ensures that no agricultural UI, navigation, or data is composed or accessible
 * unless the user identity is authenticated (SIGNED_IN or OFFLINE).
 * In unconfigured test/dev environments without an Auth backend, access is preserved.
 *
 * Prevents back navigation, deep link leaks, and active notification exposure when unauthenticated.
 */
@Composable
fun AuthGateHost(
    accountRepository: AccountRepository,
    farmLinks: LocalFarmLinkRepository? = null,
    simulationAllowed: Boolean = false,
    content: @Composable () -> Unit
) {
    val identity by accountRepository.state.collectAsStateWithLifecycle()
    val isAuthorized = !accountRepository.isConfigured || identity.status in setOf(
        AccountStatus.SIGNED_IN,
        AccountStatus.OFFLINE
    )
    val context = LocalContext.current

    LaunchedEffect(isAuthorized) {
        if (!isAuthorized) {
            val manager = context.getSystemService(NotificationManager::class.java)
            manager?.activeNotifications
                ?.filter { it.notification.channelId == ReminderNotifier.CHANNEL_ID }
                ?.forEach { manager.cancel(it.id) }
        }
    }

    if (accountRepository.isConfigured && identity.status == AccountStatus.CHECKING) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(MoSurfaceTokens.appBackground)
                .statusBarsPadding(),
            contentAlignment = Alignment.Center
        ) {
            CircularProgressIndicator(modifier = Modifier.testTag("auth-gate-loading"))
        }
    } else if (isAuthorized) {
        content()
    } else {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .testTag("auth-gate-root")
        ) {
            AccountRoute(
                repository = accountRepository,
                onBack = {},
                showBack = false,
                simulationAllowed = simulationAllowed,
                farmLinks = farmLinks
            )
        }
    }
}
