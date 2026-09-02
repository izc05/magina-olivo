#!/usr/bin/env bash
set -euo pipefail

API_BASE="${API_BASE:-http://127.0.0.1:3001}"

printf '[auth-rate-gate] Sending bounded failed-login burst\n'
rate_limited=0

for attempt in $(seq 1 20); do
  status=$(curl --silent --output "/tmp/rate-login-${attempt}.json" --write-out "%{http_code}" \
    --header 'content-type: application/json' \
    --data '{"email":"farmer-a@example.com","password":"definitely-wrong-password"}' \
    "$API_BASE/api/auth/sign-in/email")

  if [[ "$status" = "429" ]]; then
    rate_limited=1
    printf '[auth-rate-gate] PASS rate limit reached on attempt %s\n' "$attempt"
    break
  fi

  if [[ "$status" != "401" && "$status" != "400" ]]; then
    printf '[auth-rate-gate] ERROR unexpected status %s on attempt %s\n' "$status" "$attempt" >&2
    exit 1
  fi
done

[[ "$rate_limited" = "1" ]] || {
  printf '[auth-rate-gate] ERROR failed-login burst never reached HTTP 429\n' >&2
  exit 1
}
