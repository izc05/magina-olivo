#!/usr/bin/env bash
set -euo pipefail

set +e
gradle :app:connectedDebugAndroidTest --info --stacktrace > /tmp/catastro-first-attempt.log 2>&1
first_status=$?
set -e

cat /tmp/catastro-first-attempt.log

if [[ "$first_status" -eq 0 ]]; then
  exit 0
fi

if ! grep -Eqi 'Failed to find ColorBuffer|device offline|adb.*failed|Unable to connect to adb|emulator.*disconnect|transport error' /tmp/catastro-first-attempt.log; then
  echo "::error::Catastro E2E failed for a non-infrastructure reason; not retrying"
  exit "$first_status"
fi

echo "::warning::Detected emulator/ADB infrastructure failure; performing one controlled retry"
adb kill-server >/dev/null 2>&1 || true
sleep 2
adb start-server
adb wait-for-device

for _ in $(seq 1 20); do
  if [[ "$(adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" == "1" ]]; then
    gradle :app:connectedDebugAndroidTest --rerun-tasks --info --stacktrace
    exit $?
  fi
  sleep 2
done

echo "::error::Emulator did not recover before retry"
exit "$first_status"
