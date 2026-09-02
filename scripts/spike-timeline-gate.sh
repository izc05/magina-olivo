#!/usr/bin/env bash
set -euo pipefail

API_BASE="${API_BASE:-http://127.0.0.1:3001}"

fail() {
  printf '[timeline-gate] ERROR: %s\n' "$*" >&2
  exit 1
}

[[ -f /tmp/plot-a.json ]] || fail "plot fixture missing"
[[ -f /tmp/cookies-a.txt ]] || fail "Farmer A cookie jar missing"
[[ -f /tmp/cookies-b.txt ]] || fail "Farmer B cookie jar missing"

PLOT_A=$(node -e "const fs=require('fs');process.stdout.write(JSON.parse(fs.readFileSync('/tmp/plot-a.json','utf8')).id)")

status=$(curl --silent --output /tmp/plot-timeline-a.json --write-out "%{http_code}" \
  --cookie /tmp/cookies-a.txt \
  "$API_BASE/api/v1/plots/$PLOT_A/timeline")
[[ "$status" = "200" ]] || fail "owner timeline expected 200, got $status"

node - <<'NODE'
const fs = require('fs');
const { items } = JSON.parse(fs.readFileSync('/tmp/plot-timeline-a.json', 'utf8'));
if (items.length !== 2) throw new Error(`Expected delivery + current yield, got ${items.length} events`);
const delivery = items.find((item) => item.type === 'delivery');
const yieldEvent = items.find((item) => item.type === 'yield_result');
if (!delivery || delivery.kilograms !== '1842.000') throw new Error('Plot timeline delivery is missing or wrong');
if (!yieldEvent || yieldEvent.yieldPercent !== '21.9000') throw new Error('Plot timeline current yield is missing or wrong');
if (items.some((item) => item.yieldPercent === '21.7000')) throw new Error('Superseded yield leaked into current user timeline');
NODE

foreign_status=$(curl --silent --output /tmp/plot-timeline-b.json --write-out "%{http_code}" \
  --cookie /tmp/cookies-b.txt \
  "$API_BASE/api/v1/plots/$PLOT_A/timeline")
[[ "$foreign_status" = "404" ]] || fail "foreign timeline expected 404, got $foreign_status"

printf '[timeline-gate] PASS private plot timeline is reconstructed from source records\n'
