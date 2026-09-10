#!/usr/bin/env bash
set -euo pipefail

[[ $# -eq 3 ]] || { echo "usage: $0 RELEASE_ID MAP_ROOT TILEMAKER_IMAGE" >&2; exit 64; }
release_id="$1"; map_root="$2"; tilemaker="$3"; scripts="$(cd "$(dirname "$0")" && pwd)"
target="$map_root/releases/$release_id"
: "${PHOTON_DUMP_URL:?set immutable Photon dump URL}"; : "${PHOTON_DUMP_SHA256:?set Photon SHA-256}"
: "${FONT_BUNDLE_URL:?set immutable font bundle URL}"; : "${FONT_BUNDLE_SHA256:?set font SHA-256}"
: "${TILEMAKER_ASSETS_SHA256:?set tilemaker assets SHA-256}"
: "${PHOTON_IMAGE:?set digest-pinned Photon image}"; : "${VALHALLA_IMAGE:?set digest-pinned Valhalla image}"
: "${MAP_PUBLIC_BASE_URL:=https://maps.quantixlab.dev}"
[[ "$PHOTON_IMAGE" == *@sha256:* && "$VALHALLA_IMAGE" == *@sha256:* && "$tilemaker" == *@sha256:* ]] || {
  echo 'images must be digest pinned' >&2; exit 64;
}
for required in source-manifest.json region.osm.pbf tiles/region.pmtiles valhalla/valhalla_tiles.tar; do
  [[ -f "$target/$required" ]] || { echo "completed prerequisite missing: $required" >&2; exit 66; }
done
[[ -d "$target/photon" ]] || { echo 'Photon target directory is missing' >&2; exit 66; }
[[ -z "$(find "$target/photon" -mindepth 1 -print -quit)" ]] || { echo 'Photon target is not empty' >&2; exit 73; }
if [[ ! -f "$target/photon-source.zst" ]]; then
  curl --fail --location --retry 4 --continue-at - --output "$target/photon-source.zst" "$PHOTON_DUMP_URL"
fi
echo "$PHOTON_DUMP_SHA256  $target/photon-source.zst" | sha256sum --check -
chown 10001:10001 "$target/photon"; chmod 0750 "$target/photon"
zstd -dc "$target/photon-source.zst" | docker run --rm -i -v "$target/photon:/data" "$PHOTON_IMAGE" import \
  -import-file - -data-dir /data -country-codes BD,IN,PK,NP,BT,LK,MM,ID,PH,TH,MY,SG,VN,KH,LA,BN,TL,MV \
  -languages en,bn,hi,ur,ne,dz,si,ta,my,id,tl,th,ms,zh,vi,km,lo,pt,tet,dv
rm "$target/photon-source.zst"; "$scripts/prepare-presentation.sh" "$target" "$MAP_PUBLIC_BASE_URL"
jq -n --slurpfile sources "$target/source-manifest.json" --arg release "$release_id" --arg created "$(date -u +%FT%TZ)" \
  --arg photon "$PHOTON_IMAGE" --arg valhalla "$VALHALLA_IMAGE" --arg tilemaker "$tilemaker" \
  --arg tilemakerAssets "$TILEMAKER_ASSETS_SHA256" \
  '{schemaVersion:1,releaseId:$release,createdAt:$created,bounds:[60,-12,142,38],countries:["BD","IN","PK","NP","BT","LK","MM","ID","PH","TH","MY","SG","VN","KH","LA","BN","TL","MV"],languages:["en","bn","hi","ur","ne","dz","si","ta","my","id","tl","th","ms","zh","vi","km","lo","pt","tet","dv"],sources:$sources[0],inputs:{tilemakerAssetsSha256:$tilemakerAssets},images:{photon:$photon,valhalla:$valhalla,tilemaker:$tilemaker}}' >"$target/manifest.json"
(cd "$target" && find . -type f ! -name SHA256SUMS -print0 | sort -z | xargs -0 sha256sum >SHA256SUMS)
chmod -R go-w "$target"; echo "built immutable release: $target"
