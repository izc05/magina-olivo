package com.isivoltpro.maginaolivo.feature.notifications

import org.junit.Assert.assertEquals
import org.junit.Test

class NotificationPermissionPolicyTest {
    private val fresh = NotificationPermissionState(true, false, false, false, false)

    @Test fun firstSavedReminderExplainsThePermission() = expect(NotificationPermissionTrigger.FIRST_REMINDER, fresh, NotificationPermissionAction.EXPLAIN)
    @Test fun enablingRemindersIsAnExplicitPermissionContext() = expect(NotificationPermissionTrigger.ENABLE_REMINDERS, fresh, NotificationPermissionAction.EXPLAIN)
    @Test fun profileActionCanRequestTheMissingRuntimePermission() = expect(NotificationPermissionTrigger.SETTINGS, fresh, NotificationPermissionAction.EXPLAIN)
    @Test fun aDismissedExplanationDoesNotRepeatForEverySavedWork() = expect(NotificationPermissionTrigger.FIRST_REMINDER, fresh.copy(explainedBefore = true), NotificationPermissionAction.NONE)
    @Test fun deniedRuntimePermissionDoesNotRepeatAutomatically() = expect(NotificationPermissionTrigger.FIRST_REMINDER, fresh.copy(requestedBefore = true, canAskAgain = true), NotificationPermissionAction.NONE)
    @Test fun explicitActionAfterPermanentDenialOpensSettings() = expect(NotificationPermissionTrigger.SETTINGS, fresh.copy(requestedBefore = true), NotificationPermissionAction.SETTINGS)
    @Test fun explicitActivationUsesTheRationaleAllowedByAndroid() = expect(NotificationPermissionTrigger.ENABLE_REMINDERS, fresh.copy(requestedBefore = true, canAskAgain = true), NotificationPermissionAction.EXPLAIN)
    @Test fun grantingPermissionDoesNotOpenSettingsWhileSavingWork() = expect(NotificationPermissionTrigger.FIRST_REMINDER, fresh.copy(runtimeGranted = true), NotificationPermissionAction.NONE)
    @Test fun settingsStillManageAppAndChannelAfterPermissionIsGranted() = expect(NotificationPermissionTrigger.SETTINGS, fresh.copy(runtimeGranted = true), NotificationPermissionAction.SETTINGS)
    @Test fun olderAndroidNeverRequestsAnUnavailableRuntimePermission() = expect(NotificationPermissionTrigger.ENABLE_REMINDERS, fresh.copy(requiresRuntimePermission = false), NotificationPermissionAction.NONE)
    @Test fun olderAndroidRetainsItsRealSettingsAction() = expect(NotificationPermissionTrigger.SETTINGS, fresh.copy(requiresRuntimePermission = false), NotificationPermissionAction.SETTINGS)

    private fun expect(trigger: NotificationPermissionTrigger, state: NotificationPermissionState, action: NotificationPermissionAction) {
        assertEquals(action, notificationPermissionAction(trigger, state))
    }
}
