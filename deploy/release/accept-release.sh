#!/usr/bin/env bash
set -euo pipefail
: "${MAP_PUBLIC_BASE_URL:=https://maps.quantixlab.dev}"; : "${PUBLISHABLE_KEY:?set PUBLISHABLE_KEY}"; : "${SERVER_KEY:?set SERVER_KEY}"
scripts="$(cd "$(dirname "$0")" && pwd)"; fixtures="$scripts/fixtures.json"
asset=(-H "X-Quantix-Maps-Key: $PUBLISHABLE_KEY"); server=(-H "Authorization: Bearer $SERVER_KEY")
request=(curl --fail --silent --show-error --retry 20 --retry-max-time 180)
"${request[@]}" "$MAP_PUBLIC_BASE_URL/health/live" >/dev/null
"${request[@]}" "${asset[@]}" "$MAP_PUBLIC_BASE_URL/v1/styles/light.json" | jq -e '.version == 8' >/dev/null
"${request[@]}" "${asset[@]}" "$MAP_PUBLIC_BASE_URL/v1/styles/dark.json" | jq -e '.version == 8' >/dev/null
"${request[@]}" "${asset[@]}" "$MAP_PUBLIC_BASE_URL/v1/tiles/region.json" | jq -e '.tiles | length > 0' >/dev/null
"${request[@]}" "${asset[@]}" "$MAP_PUBLIC_BASE_URL/v1/tiles/region/0/0/0.pbf" >/dev/null
"${request[@]}" "${asset[@]}" "$MAP_PUBLIC_BASE_URL/v1/fonts/Noto%20Sans%20Regular/0-255.pbf" >/dev/null
"${request[@]}" "${asset[@]}" "$MAP_PUBLIC_BASE_URL/v1/sprites/default.json" | jq -e 'type == "object"' >/dev/null
for profile in DRIVING BICYCLE WALKING; do
  route="$(jq -nc --arg profile "$profile" '{profile:$profile,points:[{latitude:23.8103,longitude:90.4125},{latitude:23.7500,longitude:90.3900}]}')"
  "${request[@]}" "${server[@]}" -H 'Content-Type: application/json' -d "$route" "$MAP_PUBLIC_BASE_URL/v1/routes" | jq -e '.legs | length > 0' >/dev/null
done
match='{"profile":"DRIVING","points":[{"latitude":23.810403,"longitude":90.412496},{"latitude":23.809121,"longitude":90.413204},{"latitude":23.809417,"longitude":90.412325}]}'
"${request[@]}" "${server[@]}" -H 'Content-Type: application/json' -d "$match" "$MAP_PUBLIC_BASE_URL/v1/matches" | jq -e '.encodedPolyline6 | length > 0' >/dev/null
jq -c '.[]' "$fixtures" | while read -r fixture; do
  code="$(jq -r .countryCode <<<"$fixture")"; query="$(jq -r .query <<<"$fixture")"; lat="$(jq -r .latitude <<<"$fixture")"; lon="$(jq -r .longitude <<<"$fixture")"
  "${request[@]}" --get "${server[@]}" --data-urlencode "q=$query" --data-urlencode "countryCode=$code" "$MAP_PUBLIC_BASE_URL/v1/geocode/search" | jq -e '.items | length > 0' >/dev/null
  "${request[@]}" "${server[@]}" "$MAP_PUBLIC_BASE_URL/v1/geocode/reverse?latitude=$lat&longitude=$lon&limit=1" | jq -e '.items | type == "array"' >/dev/null
  body="$(jq -nc --argjson lat "$lat" --argjson lon "$lon" '{profile:"DRIVING",sources:[{latitude:$lat,longitude:$lon}],targets:[{latitude:($lat + 0.005),longitude:($lon + 0.005)}]}')"
  "${request[@]}" "${server[@]}" -H 'Content-Type: application/json' -d "$body" "$MAP_PUBLIC_BASE_URL/v1/matrices" | jq -e '.distancesMeters | length == 1' >/dev/null
  echo "accepted $code"
done
echo 'public release acceptance passed'
