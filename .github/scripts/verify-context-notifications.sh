#!/usr/bin/env bash
set -euo pipefail
OUT="${1:-evidence/context-notifications}"
CLASS="${2:-com.isivoltpro.maginaolivo.ContextNotificationPermissionTest}"
case "$CLASS" in
 com.isivoltpro.maginaolivo.ContextNotificationPermissionTest|com.isivoltpro.maginaolivo.FirstReminderPermissionTest\#firstSavedReminderRequestsPermissionAndPreservesWork) ;;
 *) echo 'Unsupported test class'; exit 1 ;;
esac
PKG=com.isivoltpro.maginaolivo.dev
PERMISSION=android.permission.POST_NOTIFICATIONS
[[ "$(adb shell getprop ro.kernel.qemu | tr -d '\r')" == 1 ]] || { echo 'Emulator required'; exit 1; }
mkdir -p "$OUT"
permission_state() { adb shell dumpsys package "$PKG" | tr -d '\r' | grep 'android.permission.POST_NOTIFICATIONS: granted=' | sed 's/^[[:space:]]*//'; }
BEFORE="$(permission_state)"
[[ -n "$BEFORE" ]] || { echo 'Cannot preserve notification permission'; exit 1; }
printf '%s\n' "$BEFORE" > "$OUT/permission-before.txt"
restore() {
 adb shell input keyevent KEYCODE_BACK >/dev/null
 if [[ "$BEFORE" == *'granted=true'* ]]; then adb shell pm grant "$PKG" "$PERMISSION"; else adb shell pm revoke "$PKG" "$PERMISSION"; fi
 adb shell pm clear-permission-flags "$PKG" "$PERMISSION" user-set user-fixed
 [[ "$BEFORE" != *USER_SET* ]] || adb shell pm set-permission-flags "$PKG" "$PERMISSION" user-set
 [[ "$BEFORE" != *USER_FIXED* ]] || adb shell pm set-permission-flags "$PKG" "$PERMISSION" user-fixed
 AFTER="$(permission_state)"
 printf '%s\n' "$AFTER" > "$OUT/permission-after.txt"
 [[ "$BEFORE" == "$AFTER" ]] || { echo 'Permission/flags restoration failed'; return 1; }
}
trap restore EXIT
for MODE in baseline grant deny later; do
 adb shell pm revoke "$PKG" "$PERMISSION"
 adb shell pm clear-permission-flags "$PKG" "$PERMISSION" user-set user-fixed
 adb shell am instrument -w -r -e notificationQaMode "$MODE" -e class "$CLASS" "$PKG.test/androidx.test.runner.AndroidJUnitRunner" > "$OUT/$MODE.log" 2>&1
 grep -q 'OK (1 test)' "$OUT/$MODE.log"
 if grep -Eq 'FAILURES!!!|INSTRUMENTATION_FAILED|Process crashed' "$OUT/$MODE.log"; then cat "$OUT/$MODE.log"; exit 1; fi
 echo "$MODE: 1/1"
done
