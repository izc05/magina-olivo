#!/usr/bin/env bash
set -euo pipefail

adb_recover() {
  adb kill-server >/dev/null 2>&1 || true
  sleep 2
  adb start-server
  adb wait-for-device

  for _ in $(seq 1 20); do
    if [[ "$(adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" == "1" ]]; then
      return 0
    fi
    sleep 2
  done

  echo "::error::Emulator did not become ready after ADB recovery"
  return 1
}

adb_safe() {
  if "$@"; then
    return 0
  fi

  echo "::warning::ADB command failed once; recovering ADB and retrying"
  adb_recover
  "$@"
}

gradle :app:installDebug --stacktrace

adb_recover
adb_safe adb shell settings put global hide_error_dialogs 1
adb_safe adb logcat -c
adb_safe adb shell am force-stop com.isivolt.maginaolivo
adb_safe adb shell am start -W -n com.isivolt.maginaolivo/.MainActivity
sleep 3

adb_safe adb shell uiautomator dump /sdcard/home.xml
adb_safe adb pull /sdcard/home.xml /tmp/home.xml

python3 .github/scripts/android-smoke-ui.py tap /tmp/home.xml "Abrir mapa de parcelas"

sleep 5
adb_safe adb shell uiautomator dump /sdcard/map.xml
adb_safe adb pull /sdcard/map.xml /tmp/map.xml

python3 .github/scripts/android-smoke-ui.py assert /tmp/map.xml "Volver" "Mi ubicación" "PNOA" "Catastro"
echo "ANDROID_MAP_SMOKE_OK"

if ! adb exec-out screencap -p > /tmp/map-smoke.png; then
  echo "::warning::Screenshot failed once; recovering ADB and retrying"
  adb_recover
  adb exec-out screencap -p > /tmp/map-smoke.png
fi

if ! adb logcat -d > /tmp/map-smoke-logcat.txt; then
  echo "::warning::Logcat collection failed once; recovering ADB and retrying"
  adb_recover
  adb logcat -d > /tmp/map-smoke-logcat.txt
fi
