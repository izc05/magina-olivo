#!/usr/bin/env bash
set -euo pipefail

is_infrastructure_failure() {
  local log_file="$1"

  grep -Eqi     'Failed to find ColorBuffer|device offline|adb.*failed|Unable to connect to adb|emulator.*disconnect|transport error|Failed to get resource:.*HTTP (403|429|5[0-9][0-9])|HTTP (403|429|5[0-9][0-9])|could not resolve plugin artifact|Plugin Repositories.*could not resolve|Could not resolve all files|Could not GET|Could not HEAD|Read timed out|Connection reset|Temporary failure in name resolution|UnknownHostException|Network is unreachable|TLS handshake'     "$log_file"
}

set +e
gradle :app:connectedDebugAndroidTest --info --stacktrace > /tmp/catastro-first-attempt.log 2>&1
first_status=$?
set -e

cat /tmp/catastro-first-attempt.log

if [[ "$first_status" -eq 0 ]]; then
  exit 0
fi

if ! is_infrastructure_failure /tmp/catastro-first-attempt.log; then
  echo "::error::Catastro E2E failed for a non-infrastructure reason; not retrying"
  exit "$first_status"
fi

echo "::warning::Detected emulator/ADB/network repository infrastructure failure; performing one controlled retry"
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
