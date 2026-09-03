#!/usr/bin/env bash
set -euo pipefail

API_BASE="${API_BASE:-http://127.0.0.1:3001}"

log() {
  printf '[tasks-calendar-gate] %s\n' "$*"
}

fail() {
  printf '[tasks-calendar-gate] ERROR: %s\n' "$*" >&2
  exit 1
}

json_value() {
  local file="$1"
  local expression="$2"
  node -e "const fs=require('fs');const value=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));const result=(${expression});if(result===undefined||result===null)process.exit(2);process.stdout.write(String(result));" "$file"
}

rm -f /tmp/tasks-calendar-a.cookies /tmp/tasks-calendar-b.cookies /tmp/tasks-calendar-*.json
YESTERDAY=$(date -u -d 'yesterday' +%F)
TOMORROW=$(date -u -d 'tomorrow' +%F)

log "Registering two isolated growers"
status=$(curl --silent --output /tmp/tasks-calendar-signup-a.json --write-out "%{http_code}" \
  --cookie-jar /tmp/tasks-calendar-a.cookies \
  --header 'content-type: application/json' \
  --data '{"name":"Calendar A","email":"calendar-a@example.com","password":"correct-horse-battery-staple"}' \
  "$API_BASE/api/auth/sign-up/email")
[[ "$status" = "200" ]] || fail "Calendar A signup expected 200, got $status"

status=$(curl --silent --output /tmp/tasks-calendar-signup-b.json --write-out "%{http_code}" \
  --cookie-jar /tmp/tasks-calendar-b.cookies \
  --header 'content-type: application/json' \
  --data '{"name":"Calendar B","email":"calendar-b@example.com","password":"correct-horse-battery-staple"}' \
  "$API_BASE/api/auth/sign-up/email")
[[ "$status" = "200" ]] || fail "Calendar B signup expected 200, got $status"

log "Creating one private holding per grower"
status=$(curl --silent --output /tmp/tasks-calendar-holding-a.json --write-out "%{http_code}" \
  --cookie /tmp/tasks-calendar-a.cookies \
  --header 'content-type: application/json' \
  --data '{"name":"Calendar Holding A","municipality":"Bedmar","province":"Jaen"}' \
  "$API_BASE/api/v1/holdings")
[[ "$status" = "201" ]] || fail "Holding A expected 201, got $status"
HOLDING_A=$(json_value /tmp/tasks-calendar-holding-a.json 'value.id')

status=$(curl --silent --output /tmp/tasks-calendar-holding-b.json --write-out "%{http_code}" \
  --cookie /tmp/tasks-calendar-b.cookies \
  --header 'content-type: application/json' \
  --data '{"name":"Calendar Holding B","municipality":"Huelma","province":"Jaen"}' \
  "$API_BASE/api/v1/holdings")
[[ "$status" = "201" ]] || fail "Holding B expected 201, got $status"
HOLDING_B=$(json_value /tmp/tasks-calendar-holding-b.json 'value.id')

unauth=$(curl --silent --output /tmp/tasks-calendar-unauth.json --write-out "%{http_code}" \
  "$API_BASE/api/v1/holdings/$HOLDING_A/tasks")
[[ "$unauth" = "401" ]] || fail "Unauthenticated task list expected 401, got $unauth"

log "Creating overdue and upcoming tasks"
status=$(curl --silent --output /tmp/tasks-calendar-overdue.json --write-out "%{http_code}" \
  --cookie /tmp/tasks-calendar-a.cookies \
  --header 'content-type: application/json' \
  --data "{\"title\":\"Revisar goteros\",\"dueDate\":\"$YESTERDAY\",\"priority\":\"high\",\"reminderDaysBefore\":1,\"notes\":\"Sector norte\"}" \
  "$API_BASE/api/v1/holdings/$HOLDING_A/tasks")
[[ "$status" = "201" ]] || fail "Overdue task create expected 201, got $status"
TASK_OVERDUE=$(json_value /tmp/tasks-calendar-overdue.json 'value.id')
OVERDUE_FLAG=$(json_value /tmp/tasks-calendar-overdue.json 'value.overdue')
[[ "$OVERDUE_FLAG" = "true" ]] || fail "Past pending task must be derived as overdue"

status=$(curl --silent --output /tmp/tasks-calendar-upcoming.json --write-out "%{http_code}" \
  --cookie /tmp/tasks-calendar-a.cookies \
  --header 'content-type: application/json' \
  --data "{\"title\":\"Preparar tratamiento\",\"dueDate\":\"$TOMORROW\",\"priority\":\"normal\",\"reminderDaysBefore\":2}" \
  "$API_BASE/api/v1/holdings/$HOLDING_A/tasks")
[[ "$status" = "201" ]] || fail "Upcoming task create expected 201, got $status"
TASK_UPCOMING=$(json_value /tmp/tasks-calendar-upcoming.json 'value.id')

log "Proving holding isolation"
status=$(curl --silent --output /tmp/tasks-calendar-cross-list.json --write-out "%{http_code}" \
  --cookie /tmp/tasks-calendar-b.cookies \
  "$API_BASE/api/v1/holdings/$HOLDING_A/tasks")
[[ "$status" = "404" ]] || fail "User B list of A tasks expected 404, got $status"

status=$(curl --silent --output /tmp/tasks-calendar-cross-complete.json --write-out "%{http_code}" \
  --cookie /tmp/tasks-calendar-b.cookies \
  --header 'content-type: application/json' \
  --data '{"version":1}' \
  "$API_BASE/api/v1/tasks/$TASK_UPCOMING/complete")
[[ "$status" = "404" ]] || fail "User B completion of A task expected 404, got $status"

log "Listing tasks and preserving deterministic ordering"
curl --fail --silent --cookie /tmp/tasks-calendar-a.cookies \
  "$API_BASE/api/v1/holdings/$HOLDING_A/tasks?status=pending" > /tmp/tasks-calendar-list-a.json
COUNT=$(json_value /tmp/tasks-calendar-list-a.json 'value.items.length')
[[ "$COUNT" = "2" ]] || fail "Pending task list expected 2 items, got $COUNT"
FIRST_ID=$(json_value /tmp/tasks-calendar-list-a.json 'value.items[0].id')
[[ "$FIRST_ID" = "$TASK_OVERDUE" ]] || fail "Earlier due task must be listed first"

log "Editing with optimistic concurrency"
status=$(curl --silent --output /tmp/tasks-calendar-edit.json --write-out "%{http_code}" \
  --cookie /tmp/tasks-calendar-a.cookies \
  --header 'content-type: application/json' \
  --request PATCH \
  --data '{"version":1,"title":"Preparar tratamiento ecológico","priority":"high","reminderDaysBefore":1}' \
  "$API_BASE/api/v1/tasks/$TASK_UPCOMING")
[[ "$status" = "200" ]] || fail "Task edit expected 200, got $status"
EDITED_VERSION=$(json_value /tmp/tasks-calendar-edit.json 'value.version')
[[ "$EDITED_VERSION" = "2" ]] || fail "Edited task version expected 2, got $EDITED_VERSION"

status=$(curl --silent --output /tmp/tasks-calendar-stale.json --write-out "%{http_code}" \
  --cookie /tmp/tasks-calendar-a.cookies \
  --header 'content-type: application/json' \
  --request PATCH \
  --data '{"version":1,"title":"Cambio obsoleto"}' \
  "$API_BASE/api/v1/tasks/$TASK_UPCOMING")
[[ "$status" = "409" ]] || fail "Stale task edit expected 409, got $status"
STALE_CODE=$(json_value /tmp/tasks-calendar-stale.json 'value.error.code')
[[ "$STALE_CODE" = "TASK_CONFLICT" ]] || fail "Stale task edit expected TASK_CONFLICT, got $STALE_CODE"

log "Completing task and proving completion idempotency"
status=$(curl --silent --output /tmp/tasks-calendar-complete.json --write-out "%{http_code}" \
  --cookie /tmp/tasks-calendar-a.cookies \
  --header 'content-type: application/json' \
  --data '{"version":2}' \
  "$API_BASE/api/v1/tasks/$TASK_UPCOMING/complete")
[[ "$status" = "200" ]] || fail "Task completion expected 200, got $status"
COMPLETED_STATUS=$(json_value /tmp/tasks-calendar-complete.json 'value.status')
COMPLETED_VERSION=$(json_value /tmp/tasks-calendar-complete.json 'value.version')
[[ "$COMPLETED_STATUS" = "completed" ]] || fail "Completed task status missing"
[[ "$COMPLETED_VERSION" = "3" ]] || fail "Completed task version expected 3, got $COMPLETED_VERSION"

status=$(curl --silent --output /tmp/tasks-calendar-complete-again.json --write-out "%{http_code}" \
  --cookie /tmp/tasks-calendar-a.cookies \
  --header 'content-type: application/json' \
  --data '{"version":2}' \
  "$API_BASE/api/v1/tasks/$TASK_UPCOMING/complete")
[[ "$status" = "200" ]] || fail "Repeated completion expected 200, got $status"
REPEATED_VERSION=$(json_value /tmp/tasks-calendar-complete-again.json 'value.version')
[[ "$REPEATED_VERSION" = "3" ]] || fail "Repeated completion must not increment version"

log "Rejecting invalid cross-holding scope links"
status=$(curl --silent --output /tmp/tasks-calendar-invalid-scope.json --write-out "%{http_code}" \
  --cookie /tmp/tasks-calendar-a.cookies \
  --header 'content-type: application/json' \
  --data "{\"title\":\"Scope inválido\",\"dueDate\":\"$TOMORROW\",\"farmId\":\"$HOLDING_B\"}" \
  "$API_BASE/api/v1/holdings/$HOLDING_A/tasks")
[[ "$status" = "400" ]] || fail "Invalid foreign scope expected 400, got $status"

log "TASKS CALENDAR GATE PASS"
