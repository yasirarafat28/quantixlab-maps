#!/usr/bin/env bash
set -euo pipefail

[[ $# -eq 2 ]] || { echo "usage: $0 SNAPSHOT_ID ARTIFACT_ROOT" >&2; exit 64; }
snapshot_id="$1"; artifact_root="$2"
[[ "$snapshot_id" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}\.[0-9]+$ ]] || {
  echo 'snapshot ID must be YYYY-MM-DD.N' >&2; exit 64;
}
for command in curl jq sha256sum tar unzip zstd; do
  command -v "$command" >/dev/null || { echo "missing command: $command" >&2; exit 69; }
done
[[ -d "$artifact_root" && -w "$artifact_root" ]] || { echo "artifact root is not writable: $artifact_root" >&2; exit 73; }

output="$artifact_root/tilemaker-assets-$snapshot_id.tar.zst"
[[ ! -e "$output" ]] || { echo "artifact exists: $output" >&2; exit 73; }
work="$(mktemp -d "$artifact_root/.tilemaker-assets.XXXXXX")"
trap 'rm -rf -- "$work"' EXIT
downloads="$work/downloads"; bundle="$work/bundle"
mkdir -p "$downloads" "$bundle/coastline" \
  "$bundle/landcover/ne_10m_antarctic_ice_shelves_polys" \
  "$bundle/landcover/ne_10m_urban_areas" "$bundle/landcover/ne_10m_glaciated_areas"

coast_url='https://osmdata.openstreetmap.de/download/water-polygons-split-4326.zip'
ice_url='https://naciscdn.org/naturalearth/10m/physical/ne_10m_antarctic_ice_shelves_polys.zip'
urban_url='https://naciscdn.org/naturalearth/10m/cultural/ne_10m_urban_areas.zip'
glacier_url='https://naciscdn.org/naturalearth/10m/physical/ne_10m_glaciated_areas.zip'
download() { curl --fail --location --retry 5 --retry-delay 10 --output "$downloads/$1" "$2"; }
download coastline.zip "$coast_url"; download ice.zip "$ice_url"
download urban.zip "$urban_url"; download glacier.zip "$glacier_url"
coast_sha="$(sha256sum "$downloads/coastline.zip" | cut -d' ' -f1)"
ice_sha="$(sha256sum "$downloads/ice.zip" | cut -d' ' -f1)"
urban_sha="$(sha256sum "$downloads/urban.zip" | cut -d' ' -f1)"
glacier_sha="$(sha256sum "$downloads/glacier.zip" | cut -d' ' -f1)"

unzip -q -o -j "$downloads/coastline.zip" -d "$bundle/coastline"
unzip -q -o "$downloads/ice.zip" -d "$bundle/landcover/ne_10m_antarctic_ice_shelves_polys"
unzip -q -o "$downloads/urban.zip" -d "$bundle/landcover/ne_10m_urban_areas"
unzip -q -o "$downloads/glacier.zip" -d "$bundle/landcover/ne_10m_glaciated_areas"
for required in coastline/water_polygons.shp \
  landcover/ne_10m_antarctic_ice_shelves_polys/ne_10m_antarctic_ice_shelves_polys.shp \
  landcover/ne_10m_urban_areas/ne_10m_urban_areas.shp \
  landcover/ne_10m_glaciated_areas/ne_10m_glaciated_areas.shp; do
  [[ -f "$bundle/$required" ]] || { echo "missing asset: $required" >&2; exit 65; }
done
jq -n --arg created "$(date -u +%FT%TZ)" \
  --arg coastUrl "$coast_url" --arg coastSha "$coast_sha" \
  --arg iceUrl "$ice_url" --arg iceSha "$ice_sha" \
  --arg urbanUrl "$urban_url" --arg urbanSha "$urban_sha" \
  --arg glacierUrl "$glacier_url" --arg glacierSha "$glacier_sha" \
  '{schemaVersion:1,createdAt:$created,licenses:{coastline:"ODbL-1.0",naturalEarth:"public-domain"},sources:[
    {name:"water-polygons-split-4326",url:$coastUrl,sha256:$coastSha},
    {name:"ne_10m_antarctic_ice_shelves_polys",url:$iceUrl,sha256:$iceSha},
    {name:"ne_10m_urban_areas",url:$urbanUrl,sha256:$urbanSha},
    {name:"ne_10m_glaciated_areas",url:$glacierUrl,sha256:$glacierSha}]}' >"$bundle/LICENSES.json"
tar --sort=name --mtime=@0 --owner=0 --group=0 --numeric-owner \
  --use-compress-program='zstd -19 -T0' -cf "$output" -C "$bundle" .
sha256sum "$output" | tee "$output.sha256"
