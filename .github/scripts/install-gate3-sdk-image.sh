#!/usr/bin/env bash
set -euo pipefail
# Never clean a developer's retained SDK or any device. Hosted Linux CI only.
[[ "${GITHUB_ACTIONS:-}" == true && "${RUNNER_OS:-}" == Linux && "$(uname -s)" == Linux ]] || {
  echo 'SDK retry is restricted to hosted Linux CI' >&2; exit 2;
}
sdk="$(realpath "${ANDROID_HOME:?Android SDK root required}")"
temporary="$(realpath "${RUNNER_TEMP:?Runner temporary root required}")"
case "$sdk" in
  /usr/local/lib/android/sdk|"$temporary"/gate3-sdk-retry-fixture/*) ;;
  *) echo 'Unexpected SDK root; nothing removed' >&2; exit 2 ;;
esac
manager="$sdk/cmdline-tools/latest/bin/sdkmanager"
[[ -x "$manager" ]] || { echo 'SDK Manager missing' >&2; exit 2; }
package='system-images;android-35;google_apis;x86_64'
image="$sdk/system-images/android-35/google_apis/x86_64"
installed() { [[ -s "$image/system.img" && -s "$image/package.xml" ]]; }
remove_partial() {
  local target
  for target in "$sdk/.temp" "$sdk/.downloadIntermediates"; do
    [[ "$(realpath -m "$target")" == "$target" && "$target" == "$sdk/"* ]] || {
      echo 'Unexpected download cache target; preserving it' >&2; return 2;
    }
    rm -rf -- "$target"
  done
  if ! installed; then
    [[ "$(realpath -m "$image")" == "$image" && "$image" == "$sdk/"* ]] || return 2
    rm -rf -- "$image"
  fi
}
for attempt in 1 2 3; do
  echo "Install verified API35 Google APIs image: attempt $attempt/3"
  # yes can end with SIGPIPE on success: use SDK Manager's status, not yes's.
  set +e
  yes | timeout 120s "$manager" --sdk_root="$sdk" --install "$package" --channel=0 --verbose
  result=${PIPESTATUS[1]}
  set -e
  if [[ "$result" == 0 ]] && installed; then
    echo "Android image installed successfully (attempt $attempt)"; exit 0
  fi
  echo "SDK image installation failed (status=$result); no tests declared passed" >&2
  remove_partial
  [[ "$attempt" == 3 ]] || sleep "$((attempt * 10))"
done
echo 'Android image unavailable after three bounded attempts' >&2
exit 1
