#!/usr/bin/env bash
# Explicit emulator states are separate instrumentation processes: revoking a permission
# inside an instrumented process can kill it. All settings/grants/denial flags are restored.
set -euo pipefail
# Git Bash must pass Android /sdcard paths unchanged to adb.exe.
export MSYS_NO_PATHCONV=1
SERIAL=${ANDROID_SERIAL:-$(adb get-serialno)}
PKG=com.isivoltpro.maginaolivo.dev
OUT=${1:-evidence/map-device}
device() { adb -s "$SERIAL" "$@"; }
[[ "$SERIAL" == emulator-* && "$(device shell getprop ro.kernel.qemu | tr -d '\r')" == 1 ]] || { echo 'An explicit emulator is required' >&2; exit 1; }
mkdir -p "$OUT"
LOCATION=$(device shell cmd location is-location-enabled | tr -d '\r')
PLANE=$(device shell cmd connectivity airplane-mode | tr -d '\r')
WIFI=$(device shell settings get global wifi_on | tr -d '\r')
BLUETOOTH=$(device shell settings get global bluetooth_on | tr -d '\r')
MOCK=$(device shell cmd appops get "$PKG" android:mock_location | tr -d '\r' | sed -n 's/.*MOCK_LOCATION: \([a-z_]*\).*/\1/p' | head -1)
MOCK=${MOCK:-default}
permission_line() { device shell dumpsys package "$PKG" | tr -d '\r' | grep -F "android.permission.$1: granted=" | head -1; }
FINE=$(permission_line ACCESS_FINE_LOCATION)
COARSE=$(permission_line ACCESS_COARSE_LOCATION)
[[ "$FINE" == *granted=* && "$COARSE" == *granted=* ]] || { echo 'Cannot back up runtime permissions' >&2; exit 1; }
printf 'location=%s\nairplane=%s\nwifi=%s\nbluetooth=%s\nmock=%s\n%s\n%s\n' "$LOCATION" "$PLANE" "$WIFI" "$BLUETOOTH" "$MOCK" "$FINE" "$COARSE" > "$OUT/device-before.txt"
restore_permission() {
    local permission=$1 original=$2
    device shell pm clear-permission-flags "$PKG" "android.permission.$permission" user-set user-fixed
    [[ "$original" != *USER_SET* ]] || device shell pm set-permission-flags "$PKG" "android.permission.$permission" user-set
    [[ "$original" != *USER_FIXED* ]] || device shell pm set-permission-flags "$PKG" "android.permission.$permission" user-fixed
}
cleanup() {
    local result=$?
    trap - EXIT
    set +e
    if device shell dumpsys activity activities | grep -E 'topResumedActivity.*permissioncontroller.*GrantPermissionsActivity' >/dev/null; then
        device shell input keyevent KEYCODE_BACK
    fi
    if [[ "$PLANE" == enabled ]]; then device shell cmd connectivity airplane-mode enable; else device shell cmd connectivity airplane-mode disable; fi
    if [[ "$WIFI" == 1 ]]; then device shell svc wifi enable; else device shell svc wifi disable; fi
    if [[ "$BLUETOOTH" == 1 ]]; then device shell cmd bluetooth_manager enable; else device shell cmd bluetooth_manager disable; fi
    device shell cmd location set-location-enabled "$LOCATION"
    device shell cmd appops set "$PKG" android:mock_location "$MOCK"
    [[ "$FINE" == *granted=true* ]] || device shell pm revoke "$PKG" android.permission.ACCESS_FINE_LOCATION
    [[ "$COARSE" == *granted=true* ]] || device shell pm revoke "$PKG" android.permission.ACCESS_COARSE_LOCATION
    [[ "$COARSE" != *granted=true* ]] || device shell pm grant "$PKG" android.permission.ACCESS_COARSE_LOCATION
    [[ "$FINE" != *granted=true* ]] || device shell pm grant "$PKG" android.permission.ACCESS_FINE_LOCATION
    restore_permission ACCESS_FINE_LOCATION "$FINE"
    restore_permission ACCESS_COARSE_LOCATION "$COARSE"
    local accuracy=0
    [[ "$FINE" != *524288* && "$FINE" != *SELECTED_LOCATION_ACCURACY* ]] || accuracy=524288
    device shell am instrument --no-hidden-api-checks -w -r -e mapDeviceQaMode restore-accuracy -e mapAccuracyFlag "$accuracy" \
        -e class com.isivoltpro.maginaolivo.NativeMapDeviceQaTest "$PKG.test/androidx.test.runner.AndroidJUnitRunner" > "$OUT/accuracy-restored.log"
    if ! grep -Eq 'OK \(1 test\)' "$OUT/accuracy-restored.log" || grep -Eq 'FAILURES!!!|INSTRUMENTATION_FAILED|Process crashed' "$OUT/accuracy-restored.log"; then
        echo 'Original location accuracy flag was not restored' >&2
        result=1
    fi
    if [[ "$(permission_line ACCESS_FINE_LOCATION)" != "$FINE" || "$(permission_line ACCESS_COARSE_LOCATION)" != "$COARSE" ]]; then
        echo 'Runtime permission/flag restoration failed' >&2
        result=1
    fi
    if [[ "$(device shell cmd location is-location-enabled | tr -d '\r')" != "$LOCATION" ||
          "$(device shell cmd connectivity airplane-mode | tr -d '\r')" != "$PLANE" ||
          "$(device shell settings get global wifi_on | tr -d '\r')" != "$WIFI" ||
          "$(device shell settings get global bluetooth_on | tr -d '\r')" != "$BLUETOOTH" ]]; then
        echo 'Device master setting restoration failed' >&2
        result=1
    fi
    device shell cmd location is-location-enabled > "$OUT/location-restored.txt"
    device pull "/sdcard/Android/data/$PKG/files/map-device-evidence" "$OUT/captures" >/dev/null 2>&1
    exit "$result"
}
trap cleanup EXIT
device shell cmd appops set "$PKG" android:mock_location allow
for MODE in baseline denied grant precise rotation off no-fix coarse offline; do
    for PERMISSION in ACCESS_FINE_LOCATION ACCESS_COARSE_LOCATION; do
        device shell pm revoke "$PKG" "android.permission.$PERMISSION"
        device shell pm clear-permission-flags "$PKG" "android.permission.$PERMISSION" user-set user-fixed
    done
    case "$MODE" in
        precise|rotation|off|no-fix|coarse) device shell pm grant "$PKG" android.permission.ACCESS_COARSE_LOCATION ;;
    esac
    case "$MODE" in
        precise|rotation|off|no-fix) device shell pm grant "$PKG" android.permission.ACCESS_FINE_LOCATION ;;
    esac
    if [[ "$MODE" == off ]]; then device shell cmd location set-location-enabled false; else device shell cmd location set-location-enabled true; fi
    if [[ "$MODE" == offline ]]; then
        device shell cmd connectivity airplane-mode enable
        device shell svc wifi disable
    fi
    device shell am instrument -w -r -e mapDeviceQaMode "$MODE" -e class com.isivoltpro.maginaolivo.NativeMapDeviceQaTest \
        "$PKG.test/androidx.test.runner.AndroidJUnitRunner" > "$OUT/$MODE.log"
    cat "$OUT/$MODE.log"
    grep -Eq 'OK \(1 test\)' "$OUT/$MODE.log"
    if grep -Eq 'FAILURES!!!|INSTRUMENTATION_FAILED|Process crashed' "$OUT/$MODE.log"; then exit 1; fi
done
