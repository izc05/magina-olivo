package com.isivoltpro.maginaolivo.feature.notifications

internal enum class NotificationPermissionTrigger { FIRST_REMINDER, ENABLE_REMINDERS, SETTINGS }
internal enum class NotificationPermissionAction { NONE, EXPLAIN, SETTINGS }
internal data class NotificationPermissionState(
    val requiresRuntimePermission: Boolean,
    val runtimeGranted: Boolean,
    val explainedBefore: Boolean,
    val requestedBefore: Boolean,
    val canAskAgain: Boolean,
)

internal fun notificationPermissionAction(
    trigger: NotificationPermissionTrigger,
    state: NotificationPermissionState,
): NotificationPermissionAction {
    if (!state.requiresRuntimePermission || state.runtimeGranted) {
        return if (trigger == NotificationPermissionTrigger.SETTINGS) NotificationPermissionAction.SETTINGS
        else NotificationPermissionAction.NONE
    }
    // Only the first saved reminder may explain automatically. Later explicit actions
    // can still use Android's rationale or settings, without prompting on screen entry.
    if (trigger == NotificationPermissionTrigger.FIRST_REMINDER && (state.explainedBefore || state.requestedBefore)) {
        return NotificationPermissionAction.NONE
    }
    return if (state.requestedBefore && !state.canAskAgain) NotificationPermissionAction.SETTINGS
    else NotificationPermissionAction.EXPLAIN
}
