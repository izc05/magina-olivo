#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${STAGING_BASE_URL:?set STAGING_BASE_URL, e.g. https://magina-staging.example.com}"
WEATHER_MUNICIPALITY="${STAGING_PUBLIC_WEATHER_MUNICIPALITY:-bedmar-y-garciez}"

log() {
  printf '[staging-public-magina-gate] %s\n' "$*"
}

fail() {
  printf '[staging-public-magina-gate] ERROR: %s\n' "$*" >&2
  exit 1
}

case "$BASE_URL" in
  https://*) ;;
  *) fail "STAGING_BASE_URL must use https://" ;;
esac
BASE_URL="${BASE_URL%/}"

ACCESS_HEADERS=()
if [[ -n "${CF_ACCESS_CLIENT_ID:-}" || -n "${CF_ACCESS_CLIENT_SECRET:-}" ]]; then
  [[ -n "${CF_ACCESS_CLIENT_ID:-}" && -n "${CF_ACCESS_CLIENT_SECRET:-}" ]] \
    || fail "both CF_ACCESS_CLIENT_ID and CF_ACCESS_CLIENT_SECRET must be set"
  ACCESS_HEADERS+=(
    --header "CF-Access-Client-Id: $CF_ACCESS_CLIENT_ID"
    --header "CF-Access-Client-Secret: $CF_ACCESS_CLIENT_SECRET"
  )
fi

TMP_DIR="$(mktemp -d /tmp/magina-public-gate.XXXXXX)"
cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

get_path() {
  local path="$1"
  local output="$2"
  local headers="$3"
  local status
  status=$(curl --proto '=https' --tlsv1.2 --silent --show-error \
    "${ACCESS_HEADERS[@]}" \
    --dump-header "$headers" \
    --output "$output" \
    --write-out '%{http_code}' \
    "$BASE_URL$path")
  [[ "$status" = "200" ]] || fail "$path expected 200, got $status"
}

log "Checking public Mágina pages"
page_paths=(
  /magina
  /magina/tiempo
  /magina/campo
  /magina/noticias
  /magina/mercado
  /magina/directorio
)
for path in "${page_paths[@]}"; do
  safe_name="${path//\//_}"
  get_path "$path" "$TMP_DIR/page${safe_name}.html" "$TMP_DIR/page${safe_name}.headers"
  grep -qi '^content-type:.*text/html' "$TMP_DIR/page${safe_name}.headers" \
    || fail "$path did not return HTML"
done

log "Checking public source registry"
get_path '/api/v1/public/sources' "$TMP_DIR/sources.json" "$TMP_DIR/sources.headers"
node - "$TMP_DIR/sources.json" <<'NODE'
const fs = require('node:fs');
const body = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
if (!Array.isArray(body.items)) throw new Error('sources.items is not an array');
const required = new Set([
  'aemet-municipality-forecast',
  'raif-olivar-observations',
  'observatorio-agricultural-prices',
  'dop-sierra-magina-destinations',
  'junta-agriculture-news',
]);
for (const item of body.items) {
  if (required.has(item.key)) {
    if (!item.provider || !item.label) throw new Error(`source ${item.key} is missing provider/label`);
    if (item.sourceUrl !== null && !String(item.sourceUrl).startsWith('https://')) throw new Error(`source ${item.key} has a non-HTTPS URL`);
    required.delete(item.key);
  }
}
if (required.size) throw new Error(`missing public sources: ${[...required].join(', ')}`);
NODE

log "Checking cooperative and oil-mill directory"
get_path '/api/v1/public/destinations' "$TMP_DIR/destinations.json" "$TMP_DIR/destinations.headers"
node - "$TMP_DIR/destinations.json" <<'NODE'
const fs = require('node:fs');
const body = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
if (!Array.isArray(body.items) || body.items.length === 0) throw new Error('public destination directory is empty');
if (!body.source || !body.source.label) throw new Error('directory source metadata is missing');
for (const item of body.items) {
  for (const key of ['websiteUrl', 'sourceUrl']) {
    if (item[key] !== null && item[key] !== undefined && !String(item[key]).startsWith('https://')) {
      throw new Error(`directory item ${item.id} exposes a non-HTTPS ${key}`);
    }
  }
}
NODE

log "Checking RAIF field context"
get_path '/api/v1/public/field-alerts' "$TMP_DIR/field-alerts.json" "$TMP_DIR/field-alerts.headers"
node - "$TMP_DIR/field-alerts.json" <<'NODE'
const fs = require('node:fs');
const body = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
if (!body.source?.provider || !body.source?.label) throw new Error('RAIF source metadata is missing');
if (!body.freshness?.status) throw new Error('RAIF freshness is missing');
if (body.usage !== 'regional-fitosanitary-context-not-plot-diagnosis') throw new Error('RAIF usage guard changed');
if (!Array.isArray(body.resources) || body.resources.length === 0) throw new Error('RAIF resources are empty');
for (const resource of body.resources) {
  if (!String(resource.url || '').startsWith('https://')) throw new Error('RAIF resource URL is not HTTPS');
}
NODE

log "Checking verified public news"
get_path '/api/v1/public/news' "$TMP_DIR/news.json" "$TMP_DIR/news.headers"
node - "$TMP_DIR/news.json" <<'NODE'
const fs = require('node:fs');
const body = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
if (body.policy !== 'verified-metadata-only-no-article-copy') throw new Error('news metadata-only policy changed');
if (!body.source?.provider || !body.source?.label) throw new Error('news source metadata is missing');
if (!Array.isArray(body.items) || body.items.length === 0) throw new Error('verified news list is empty');
for (const item of body.items) {
  if (!item.title || !item.publishedAt) throw new Error('news item is missing title/date');
  if (!String(item.sourceUrl || '').startsWith('https://')) throw new Error('news source URL is not HTTPS');
  if ('content' in item || 'body' in item || 'article' in item) throw new Error('news endpoint exposed article content');
}
NODE

log "Checking market source freshness metadata"
node - "$TMP_DIR/sources.json" <<'NODE'
const fs = require('node:fs');
const body = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const market = body.items.find((item) => item.key === 'observatorio-agricultural-prices');
if (!market) throw new Error('market source is missing');
if (!market.provider || !market.label) throw new Error('market source metadata is incomplete');
if (!market.metadata || typeof market.metadata !== 'object') throw new Error('market metadata is missing');
if (!market.lastCheckedAt && !market.lastSuccessAt) throw new Error('market source has no verification timestamp');
NODE

log "Checking AEMET weather for municipality=$WEATHER_MUNICIPALITY"
get_path "/api/v1/public/weather?municipality=$WEATHER_MUNICIPALITY" "$TMP_DIR/weather.json" "$TMP_DIR/weather.headers"
node - "$TMP_DIR/weather.json" "$WEATHER_MUNICIPALITY" <<'NODE'
const fs = require('node:fs');
const body = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const expectedSlug = process.argv[3];
if (body.municipality?.slug !== expectedSlug) throw new Error(`weather municipality mismatch: ${body.municipality?.slug}`);
if (body.source?.attribution !== 'AEMET') throw new Error('weather attribution is not AEMET');
if (!body.forecast?.provider || !Array.isArray(body.forecast?.days) || body.forecast.days.length === 0) throw new Error('weather forecast is empty');
if (!body.freshness?.status) throw new Error('weather freshness is missing');
if (!['live', 'cache', 'degraded-cache'].includes(body.availability?.mode)) throw new Error('weather availability mode is invalid');
NODE

log "PUBLIC MÁGINA GATE PASS municipality=$WEATHER_MUNICIPALITY"
