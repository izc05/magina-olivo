#!/usr/bin/env bash
set -euo pipefail

# Disposable native DEV only: no link, remote credentials or production deployment.
command -v supabase >/dev/null
docker info >/dev/null
baseline="${G0_NATIVE_BASELINE:-clean}"
[[ "$baseline" == clean || "$baseline" == legacy ]] || exit 1
work="$(mktemp -d)"
project="magina-g0-native-${GITHUB_RUN_ID:-local}-${GITHUB_RUN_ATTEMPT:-1}-$$"
[[ "$project" =~ ^magina-g0-native-[a-z0-9-]+$ ]] || exit 1
if docker container inspect "supabase_db_$project" >/dev/null 2>&1; then
  echo 'Refusing to use an existing DEV project' >&2
  exit 1
fi
mkdir -p evidence/g0-native

cleanup() {
  # Only this newly created project; never --all or a retained user's stack.
  supabase stop --workdir "$work" --project-id "$project" --no-backup >/dev/null 2>&1 || true
}
trap cleanup EXIT

supabase init --workdir "$work"
python3 - "$work/supabase/config.toml" "$project" <<'PY'
import pathlib, re, sys
path = pathlib.Path(sys.argv[1])
text = path.read_text()
text = re.sub(r'^project_id = .*$', f'project_id = "{sys.argv[2]}"', text, flags=re.M)
text = re.sub(r'(?m)^major_version = \d+$', 'major_version = 17', text)
path.write_text(text)
PY

# Do not print the CLI's local access keys. Raw status stays in the temporary directory.
if ! supabase start --workdir "$work" --exclude studio,postgres-meta,imgproxy,realtime,edge-runtime,logflare,vector,supavisor > "$work/start.log" 2>&1; then
  grep -Ei 'error|failed|unhealthy' "$work/start.log" | tail -20 >&2 || true
  exit 1
fi
supabase status --workdir "$work" --output json > "$work/status.json"
G0_NATIVE_STATUS_FILE="$work/status.json" G0_NATIVE_PROJECT_ID="$project" G0_NATIVE_BASELINE="$baseline" \
  node --test supabase/tests/native_supabase_g0.test.mjs 2>&1 | tee "evidence/g0-native/$baseline-tests.txt"
