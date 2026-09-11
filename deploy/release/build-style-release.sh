#!/usr/bin/env bash
set -euo pipefail

[[ $# -eq 3 ]] || { echo "usage: $0 STYLE_ID MAP_ROOT PUBLIC_BASE_URL" >&2; exit 64; }
style_id="$1"; map_root="$(cd "$2" && pwd)"; public_url="${3%/}"
scripts="$(cd "$(dirname "$0")" && pwd)"; target="$map_root/style-releases/$style_id"
[[ "$style_id" =~ ^[A-Za-z0-9][A-Za-z0-9._-]*$ ]] || { echo 'invalid style ID' >&2; exit 64; }
[[ "$public_url" =~ ^https:// ]] || { echo 'PUBLIC_BASE_URL must use HTTPS' >&2; exit 64; }
[[ -f "$map_root/current/tiles/region.pmtiles" ]] || { echo 'active PMTiles missing' >&2; exit 66; }
[[ ! -e "$target" ]] || { echo "style release exists: $target" >&2; exit 73; }

mkdir -p "$target"
dataset_version="$(basename "$(realpath "$map_root/current")")"
for theme in light dark; do
  sed -e "s|__MAP_PUBLIC_BASE_URL__|$public_url|g" \
    "$scripts/../maps/style-$theme-v1.template.json" >"$target/$theme.json"
  sed -e "s|__MAP_PUBLIC_BASE_URL__|$public_url|g" -e "s|__DATASET_VERSION__|$dataset_version|g" \
    "$scripts/../maps/style-$theme.template.json" >"$target/$theme-v2.json"
done

for style in "$target"/*.json; do jq -e '.version == 8 and .sources.region and .glyphs' "$style" >/dev/null; done
(cd "$target" && sha256sum ./*.json >SHA256SUMS && sha256sum --check SHA256SUMS)
chmod -R a+rX "$target"
echo "style release ready: $target dataset=$dataset_version"
