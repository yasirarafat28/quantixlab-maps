#!/usr/bin/env bash
set -euo pipefail

[[ $# -eq 2 ]] || { echo "usage: $0 RELEASE_ID MAP_ROOT" >&2; exit 64; }
release_id="$1"; map_root="$2"; scripts="$(cd "$(dirname "$0")" && pwd)"
[[ "$release_id" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}\.[0-9]+$ ]] || { echo 'release ID must be YYYY-MM-DD.N' >&2; exit 64; }
"$scripts/preflight.sh" "$map_root"
: "${PHOTON_DUMP_URL:?set immutable Photon dump URL}"; : "${PHOTON_DUMP_SHA256:?set Photon SHA-256}"
: "${TILEMAKER_ASSETS_URL:?set immutable tilemaker assets URL}"
: "${TILEMAKER_ASSETS_SHA256:?set tilemaker assets SHA-256}"
: "${PHOTON_IMAGE:?set digest-pinned Photon image}"; : "${VALHALLA_IMAGE:?set digest-pinned Valhalla image}"
: "${MAP_PUBLIC_BASE_URL:=https://maps.quantixlab.dev}"
[[ "$PHOTON_IMAGE" == *@sha256:* && "$VALHALLA_IMAGE" == *@sha256:* ]] || { echo 'images must be digest pinned' >&2; exit 64; }
releases="$map_root/releases"; target="$releases/$release_id"; [[ ! -e "$target" ]] || { echo "release exists: $target" >&2; exit 73; }
mkdir -p "$target"/{source,tiles,valhalla,photon}
: >"$target/source-manifest.ndjson"
case "$(uname -m)" in
  x86_64) tilemaker='ghcr.io/systemed/tilemaker@sha256:bdc034e2a56952a2b7e401a3bb216e95197c0dd683ee2039f33390c3c1c43bf0' ;;
  arm64|aarch64) tilemaker='ghcr.io/systemed/tilemaker@sha256:8996f3dac38ac59ba02d900b847b1613d9fbb3e121cf6c101c824681a276f3f5' ;;
esac
countries=(bangladesh india pakistan nepal bhutan sri-lanka maldives myanmar indonesia philippines thailand vietnam cambodia laos malaysia-singapore-brunei)
for country in "${countries[@]}"; do
  url="https://download.geofabrik.de/asia/${country}-latest.osm.pbf"
  curl --fail --location --retry 4 --continue-at - --output "$target/source/$country.osm.pbf" "$url"
  curl --fail --location --retry 4 --output "$target/source/$country.osm.pbf.md5" "$url.md5"
  expected="$(cut -d' ' -f1 "$target/source/$country.osm.pbf.md5")"; actual="$(md5sum "$target/source/$country.osm.pbf" | cut -d' ' -f1)"
  [[ "$expected" == "$actual" ]] || { echo "publisher checksum failed: $country" >&2; exit 65; }
  source_date="$(osmium fileinfo -g header.option.osmosis_replication_timestamp "$target/source/$country.osm.pbf" 2>/dev/null || true)"
  jq -nc --arg region "$country" --arg url "$url" --arg sourceDate "$source_date" --arg publisherMd5 "$expected" \
    '{region:$region,url:$url,sourceDate:$sourceDate,publisherMd5:$publisherMd5}' >>"$target/source-manifest.ndjson"
done
jq -s . "$target/source-manifest.ndjson" >"$target/source-manifest.json"; rm "$target/source-manifest.ndjson"
osmium merge "$target"/source/*.osm.pbf --overwrite --output "$target/region.osm.pbf"
mkdir -p "$target/tilemaker-assets" "$target/tilemaker-store"
curl --fail --location --retry 4 --output "$target/tilemaker-assets.tar.zst" "$TILEMAKER_ASSETS_URL"
echo "$TILEMAKER_ASSETS_SHA256  $target/tilemaker-assets.tar.zst" | sha256sum --check -
tar --use-compress-program=unzstd -xf "$target/tilemaker-assets.tar.zst" -C "$target/tilemaker-assets"
for required in coastline/water_polygons.shp \
  landcover/ne_10m_antarctic_ice_shelves_polys/ne_10m_antarctic_ice_shelves_polys.shp \
  landcover/ne_10m_urban_areas/ne_10m_urban_areas.shp \
  landcover/ne_10m_glaciated_areas/ne_10m_glaciated_areas.shp; do
  [[ -f "$target/tilemaker-assets/$required" ]] || { echo "tilemaker asset missing: $required" >&2; exit 65; }
done
docker run --rm -v "$target:/data" -w /data/tilemaker-assets "$tilemaker" /data/region.osm.pbf \
  --output /data/tiles/region.pmtiles --config /usr/src/app/config.json --process /usr/src/app/process.lua \
  --bbox 60,-12,142,38 --store /data/tilemaker-store
rm -rf "$target/tilemaker-assets" "$target/tilemaker-store" "$target/tilemaker-assets.tar.zst"
pmtiles verify "$target/tiles/region.pmtiles"; pmtiles show "$target/tiles/region.pmtiles" >"$target/tiles/region.metadata.txt"
cp "$target/region.osm.pbf" "$target/valhalla/region.osm.pbf"
docker run --rm -v "$target/valhalla:/custom_files" -e tile_file=/custom_files/region.osm.pbf -e force_rebuild=True \
  -e build_admins=True -e build_time_zones=True -e use_default_speeds_config=True -e serve_tiles=False "$VALHALLA_IMAGE"
curl --fail --location --retry 4 --continue-at - --output "$target/photon-source.zst" "$PHOTON_DUMP_URL"
echo "$PHOTON_DUMP_SHA256  $target/photon-source.zst" | sha256sum --check -
chown 10001:10001 "$target/photon"; chmod 0750 "$target/photon"
zstd -dc "$target/photon-source.zst" | docker run --rm -i -v "$target/photon:/data" "$PHOTON_IMAGE" import -import-file - -data-dir /data \
  -country-codes BD,IN,PK,NP,BT,LK,MM,ID,PH,TH,MY,SG,VN,KH,LA,BN,TL,MV \
  -languages en,bn,hi,ur,ne,dz,si,ta,my,id,tl,th,ms,zh,vi,km,lo,pt,tet,dv
rm "$target/photon-source.zst"; "$scripts/prepare-presentation.sh" "$target" "$MAP_PUBLIC_BASE_URL"
jq -n --slurpfile sources "$target/source-manifest.json" --arg release "$release_id" --arg created "$(date -u +%FT%TZ)" --arg photon "$PHOTON_IMAGE" --arg valhalla "$VALHALLA_IMAGE" --arg tilemaker "$tilemaker" --arg tilemakerAssets "$TILEMAKER_ASSETS_SHA256" \
  '{schemaVersion:1,releaseId:$release,createdAt:$created,bounds:[60,-12,142,38],countries:["BD","IN","PK","NP","BT","LK","MM","ID","PH","TH","MY","SG","VN","KH","LA","BN","TL","MV"],languages:["en","bn","hi","ur","ne","dz","si","ta","my","id","tl","th","ms","zh","vi","km","lo","pt","tet","dv"],sources:$sources[0],inputs:{tilemakerAssetsSha256:$tilemakerAssets},images:{photon:$photon,valhalla:$valhalla,tilemaker:$tilemaker}}' >"$target/manifest.json"
(cd "$target" && find . -type f ! -name SHA256SUMS -print0 | sort -z | xargs -0 sha256sum >SHA256SUMS)
chmod -R go-w "$target"; echo "built immutable release: $target"
