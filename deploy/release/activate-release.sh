#!/usr/bin/env bash
set -euo pipefail
[[ $# -eq 2 ]] || { echo "usage: $0 RELEASE_ID MAP_ROOT" >&2; exit 64; }
release_id="$1"; map_root="$(cd "$2" && pwd)"; release="$map_root/releases/$release_id"
[[ -f "$release/manifest.json" && -f "$release/SHA256SUMS" ]] || { echo "incomplete release: $release" >&2; exit 66; }
jq -e --arg id "$release_id" '.schemaVersion == 1 and .releaseId == $id' "$release/manifest.json" >/dev/null
previous="$(readlink "$map_root/current" 2>/dev/null || true)"
if [[ "$previous" == "releases/$release_id" ]]; then
  echo "already activated=$release_id"
  exit 0
fi
(cd "$release" && sha256sum --check SHA256SUMS)
ln -sfn "releases/$release_id" "$map_root/current.next"; mv -Tf "$map_root/current.next" "$map_root/current"
echo "activated=$release_id previous=${previous:-none}"
