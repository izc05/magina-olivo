#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Load only the existing function; never execute the device QA script.
source <(sed -n '/^dismiss_quickstep_anr() {$/,/^}$/p' "$root/gate3-emulator-evidence.sh")
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
sleep() { :; }
tap_text_from_xml() { [[ "$1" == 'Close app' ]] || return 1; tapped=true; }
check_case() {
  local title="$1" close="$2" expected="$3"
  printf '<node text="%s"/><node text="%s"/>\n' "$title" "$close" > "$tmp/ui.xml"
  tapped=false
  if dismiss_quickstep_anr "$tmp/ui.xml"; then result=true; else result=false; fi
  [[ "$result" == "$expected" && "$tapped" == "$expected" ]] || {
    echo "FAIL: $title / $close" >&2; exit 1;
  }
  echo "PASS: $title / $close"
}
check_case "Pixel Launcher isn't responding" 'Close app' true
check_case "Quickstep isn't responding" 'Close app' true
check_case "Mágina Olivo isn't responding" 'Close app' false
check_case "Pixel Launcher isn't responding" 'Wait' false
check_case "Another Launcher isn't responding" 'Close app' false
