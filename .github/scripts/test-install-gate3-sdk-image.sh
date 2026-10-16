#!/usr/bin/env bash
set -euo pipefail
script="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/install-gate3-sdk-image.sh"
tmp="$(mktemp -d)"
tmp="$(realpath "$tmp")"
[[ "$tmp" == "$(realpath "${TMPDIR:-/tmp}")/"* ]] || exit 1
trap 'rm -rf -- "$tmp"' EXIT
mkdir -p "$tmp/bin"
printf '#!/usr/bin/env bash\nprintf "Linux\\n"\n' > "$tmp/bin/uname"
printf '#!/usr/bin/env bash\nexit 0\n' > "$tmp/bin/sleep"
chmod +x "$tmp/bin/"*
export PATH="$tmp/bin:$PATH" GITHUB_ACTIONS=true RUNNER_OS=Linux RUNNER_TEMP="$tmp"
make_sdk() {
  export ANDROID_HOME="$tmp/gate3-sdk-retry-fixture/$1/sdk"
  mkdir -p "$ANDROID_HOME/cmdline-tools/latest/bin" "$ANDROID_HOME/.temp" "$ANDROID_HOME/.downloadIntermediates"
  printf 'partial' > "$ANDROID_HOME/.temp/partial.zip"
  cat > "$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager" <<'SDK'
#!/usr/bin/env bash
set -euo pipefail
root="${1#--sdk_root=}"
count=0; [[ ! -f "$root/attempts" ]] || count="$(cat "$root/attempts")"
count=$((count+1)); printf '%s' "$count" > "$root/attempts"
if [[ "$count" -le "${FAKE_FAILURES:-1}" ]]; then
  echo 'Error on ZipFile unknown archive' >&2; exit 42
fi
[[ ! -f "$root/.temp/partial.zip" ]] || { echo 'Partial download was reused' >&2; exit 43; }
if [[ "${FAKE_MISSING_FILES:-0}" != 1 ]]; then
  mkdir -p "$root/system-images/android-35/google_apis/x86_64"
  printf 'fixture' > "$root/system-images/android-35/google_apis/x86_64/system.img"
  printf '<fixture/>' > "$root/system-images/android-35/google_apis/x86_64/package.xml"
fi
SDK
  chmod +x "$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager"
}
make_sdk recover
FAKE_FAILURES=1 bash "$script" > "$tmp/recover.log" 2>&1
[[ "$(cat "$ANDROID_HOME/attempts")" == 2 ]] || exit 1
echo 'PASS: corrupt download removed and second install succeeds'
make_sdk permanent
if FAKE_FAILURES=99 bash "$script" > "$tmp/permanent.log" 2>&1; then echo 'Accepted broken image'; exit 1; fi
[[ "$(cat "$ANDROID_HOME/attempts")" == 3 ]] || exit 1
echo 'PASS: three failures remain a failure'
make_sdk missing
if FAKE_FAILURES=1 FAKE_MISSING_FILES=1 bash "$script" > "$tmp/missing.log" 2>&1; then echo 'Accepted missing image files'; exit 1; fi
echo 'PASS: zero exit without installed image cannot pass'
make_sdk local
if GITHUB_ACTIONS=false bash "$script" > "$tmp/local.log" 2>&1; then echo 'Accepted local host'; exit 1; fi
[[ -f "$ANDROID_HOME/.temp/partial.zip" && ! -f "$ANDROID_HOME/attempts" ]] || exit 1
echo 'PASS: local SDK preserved before any operation'
export ANDROID_HOME="$tmp/outside"
mkdir -p "$ANDROID_HOME/.temp"; printf 'keep' > "$ANDROID_HOME/.temp/partial.zip"
if bash "$script" > "$tmp/outside.log" 2>&1; then echo 'Accepted unrelated SDK root'; exit 1; fi
[[ -f "$ANDROID_HOME/.temp/partial.zip" ]] || exit 1
echo 'PASS: unrelated SDK root preserved'
echo 'SDK image retry: 5/5 safety and recovery cases'
