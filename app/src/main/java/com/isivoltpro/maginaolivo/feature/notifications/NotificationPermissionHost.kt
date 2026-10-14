package com.isivoltpro.maginaolivo.feature.notifications

import android.Manifest
import android.app.Activity
import android.content.Context
import android.content.ContextWrapper
import android.content.pm.PackageManager
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LifecycleEventEffect
import com.isivoltpro.maginaolivo.data.reminder.ReminderNotifier
import com.isivoltpro.maginaolivo.data.reminder.notificationSettingsIntent
import com.isivoltpro.maginaolivo.data.reminder.notificationsAllowed
import com.isivoltpro.maginaolivo.ui.components.MoPrimaryButton
import com.isivoltpro.maginaolivo.ui.components.MoTertiaryButton
import com.isivoltpro.maginaolivo.ui.theme.MoColors
import com.isivoltpro.maginaolivo.ui.theme.MoSurfaceTokens

internal class NotificationPermissionAccess(
    val allowed: State<Boolean>,
    val request: (NotificationPermissionTrigger) -> Unit,
)

internal val LocalNotificationPermissionAccess = staticCompositionLocalOf<NotificationPermissionAccess?> { null }

/** Device-only UI history; it never changes reminder preferences or agricultural records. */
private class NotificationPermissionHistory(context: Context) {
    private val preferences = context.applicationContext.getSharedPreferences("notification_permission_history", Context.MODE_PRIVATE)
    val explained get() = preferences.getBoolean("explanation_shown", false)
    val requested get() = preferences.getBoolean("runtime_requested", false)
    fun markExplained() { preferences.edit().putBoolean("explanation_shown", true).apply() }
    fun markRequested() { preferences.edit().putBoolean("runtime_requested", true).apply() }
}

private fun Context.permissionActivity(): Activity? {
    var current: Context = this
    while (current is ContextWrapper) {
        if (current is Activity) return current
        current = current.baseContext
    }
    return current as? Activity
}

/** Lifecycle-owned contextual permission launcher for Perfil; never on entry. */
@Composable
internal fun NotificationPermissionHost(
    content: @Composable () -> Unit,
) {
    val context = LocalContext.current
    val history = remember(context) { NotificationPermissionHistory(context) }
    val allowed = remember(context) { mutableStateOf(notificationsAllowed(context, ReminderNotifier.CHANNEL_ID)) }
    var pendingTrigger by rememberSaveable { mutableStateOf<String?>(null) }
    fun refresh() { allowed.value = notificationsAllowed(context, ReminderNotifier.CHANNEL_ID) }
    LifecycleEventEffect(Lifecycle.Event.ON_RESUME) { refresh() }
    val launcher = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { refresh() }
    fun readiness(): NotificationPermissionState {
        val required = Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
        return NotificationPermissionState(
            requiresRuntimePermission = required,
            runtimeGranted = !required || ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED,
            explainedBefore = history.explained,
            requestedBefore = history.requested,
            canAskAgain = required && context.permissionActivity()?.let {
                ActivityCompat.shouldShowRequestPermissionRationale(it, Manifest.permission.POST_NOTIFICATIONS)
            } == true,
        )
    }
    fun request(trigger: NotificationPermissionTrigger) {
        if (pendingTrigger != null) return
        refresh()
        when (notificationPermissionAction(trigger, readiness())) {
            NotificationPermissionAction.NONE -> Unit
            NotificationPermissionAction.SETTINGS -> context.startActivity(notificationSettingsIntent(context, ReminderNotifier.CHANNEL_ID))
            NotificationPermissionAction.EXPLAIN -> {
                history.markExplained()
                pendingTrigger = trigger.name
            }
        }
    }
    val access = NotificationPermissionAccess(allowed, ::request)
    CompositionLocalProvider(LocalNotificationPermissionAccess provides access) { content() }
    pendingTrigger?.let { name ->
        val trigger = NotificationPermissionTrigger.valueOf(name)
        AlertDialog(
            modifier = Modifier.testTag("notification-permission-dialog"),
            onDismissRequest = { pendingTrigger = null },
            containerColor = MoSurfaceTokens.cardSurface,
            titleContentColor = MoColors.current.primaryText,
            textContentColor = MoSurfaceTokens.secondaryText,
            title = { Text("Permitir avisos") },
            text = { Text(if (trigger == NotificationPermissionTrigger.FIRST_REMINDER)
                "Para avisarte de este trabajo, Android necesita permitir las notificaciones de Mágina Olivo."
                else "Para recibir avisos de los trabajos planificados, Android necesita permitir las notificaciones de Mágina Olivo.") },
            confirmButton = {
                MoPrimaryButton("Permitir notificaciones", {
                    pendingTrigger = null
                    val state = readiness()
                    if (state.requiresRuntimePermission && !state.runtimeGranted) {
                        history.markRequested()
                        runCatching { launcher.launch(Manifest.permission.POST_NOTIFICATIONS) }
                            .onFailure { context.startActivity(notificationSettingsIntent(context, ReminderNotifier.CHANNEL_ID)) }
                    } else refresh()
                }, Modifier.testTag("notification-permission-continue"))
            },
            dismissButton = { MoTertiaryButton("Ahora no", { pendingTrigger = null }, Modifier.testTag("notification-permission-later")) },
        )
    }
}
