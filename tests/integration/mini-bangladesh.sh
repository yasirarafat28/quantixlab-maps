#!/usr/bin/env bash
set -euo pipefail
: "${MINI_MAPS_BASE_URL:?self-hosted runner must provide MINI_MAPS_BASE_URL}"
: "${MINI_PUBLISHABLE_KEY:?self-hosted runner must provide MINI_PUBLISHABLE_KEY}"
: "${MINI_SERVER_KEY:?self-hosted runner must provide MINI_SERVER_KEY}"
export MAP_PUBLIC_BASE_URL="$MINI_MAPS_BASE_URL" PUBLISHABLE_KEY="$MINI_PUBLISHABLE_KEY" SERVER_KEY="$MINI_SERVER_KEY"
curl --fail --silent -H "X-Quantix-Maps-Key: $PUBLISHABLE_KEY" "$MAP_PUBLIC_BASE_URL/v1/tiles/region.json" | jq -e '.tiles | length > 0' >/dev/null
curl --fail --silent -H "Authorization: Bearer $SERVER_KEY" "$MAP_PUBLIC_BASE_URL/v1/geocode/search?q=Dhaka&countryCode=BD" | jq -e '.items | length > 0' >/dev/null
route='{"profile":"DRIVING","points":[{"latitude":23.8103,"longitude":90.4125},{"latitude":23.7500,"longitude":90.3900}]}'
curl --fail --silent -H "Authorization: Bearer $SERVER_KEY" -H 'Content-Type: application/json' -d "$route" "$MAP_PUBLIC_BASE_URL/v1/routes" | jq -e '.legs | length > 0' >/dev/null
echo 'miniature Bangladesh integration passed'
