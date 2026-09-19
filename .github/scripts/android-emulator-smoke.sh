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

dump_ui() {
  local remote="$1"
  local local_path="$2"
  adb_safe adb shell uiautomator dump "$remote"
  adb_safe adb pull "$remote" "$local_path"
}

restart_app() {
  adb_safe adb shell am force-stop com.isivolt.maginaolivo
  adb_safe adb shell am start -W -n com.isivolt.maginaolivo/.MainActivity
  sleep 3
}

recover_quickstep_anr_once() {
  local xml_path="$1"
  if ! grep -q "Quickstep isn't responding" "$xml_path"; then
    return 0
  fi

  echo "::warning::Quickstep launcher ANR detected; recovering emulator launcher once"
  adb shell input keyevent BACK >/dev/null 2>&1 || true
  adb shell am force-stop com.android.launcher3 >/dev/null 2>&1 || true
  adb shell am force-stop com.google.android.apps.nexuslauncher >/dev/null 2>&1 || true
  sleep 2
  restart_app
  dump_ui /sdcard/home.xml /tmp/home.xml

  if grep -q "Quickstep isn't responding" /tmp/home.xml; then
    echo "::error::Quickstep launcher ANR persisted after recovery"
    return 1
  fi
}

complete_onboarding_if_needed() {
  dump_ui /sdcard/home.xml /tmp/home.xml
  recover_quickstep_anr_once /tmp/home.xml

  if ! grep -q 'text="BIENVENIDA"' /tmp/home.xml; then
    return 0
  fi

  echo "Fresh install detected; completing canonical onboarding"
  for _ in 1 2 3 4 5; do
    python3 .github/scripts/android-smoke-ui.py tap /tmp/home.xml "Continuar"
    sleep 1
    dump_ui /sdcard/home.xml /tmp/home.xml
  done

  python3 .github/scripts/android-smoke-ui.py tap /tmp/home.xml "Entrar en Mágina Olivo"
  sleep 2
  dump_ui /sdcard/home.xml /tmp/home.xml
}

gradle :app:installDebug --stacktrace

adb_recover
adb_safe adb shell settings put global hide_error_dialogs 1
adb_safe adb logcat -c
restart_app

complete_onboarding_if_needed

python3 .github/scripts/android-smoke-ui.py assert /tmp/home.xml "Inicio" "Mi Olivar"
python3 .github/scripts/android-smoke-ui.py tap /tmp/home.xml "Mi Olivar"

sleep 2
dump_ui /sdcard/olivar.xml /tmp/olivar.xml
python3 .github/scripts/android-smoke-ui.py tap /tmp/olivar.xml "Abrir mapa de parcelas"

sleep 5
dump_ui /sdcard/map.xml /tmp/map.xml

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
