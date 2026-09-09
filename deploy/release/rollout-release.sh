#!/usr/bin/env bash
set -euo pipefail
[[ $# -eq 3 ]] || { echo "usage: $0 RELEASE_ID MAP_ROOT ENV_FILE" >&2; exit 64; }
release_id="$1"; map_root="$(cd "$2" && pwd)"; env_file="$(realpath "$3")"; scripts="$(cd "$(dirname "$0")" && pwd)"
previous="$(readlink "$map_root/current" 2>/dev/null || true)"; compose="$scripts/../compose.yaml"
restore() {
  if [[ -n "$previous" && -d "$map_root/$previous" ]]; then
    ln -sfn "$previous" "$map_root/current.next"; mv -Tf "$map_root/current.next" "$map_root/current"
    docker compose --env-file "$env_file" -f "$compose" up -d --force-recreate --wait
    echo "rollout failed; restored $previous" >&2
  else echo 'rollout failed; no previous release exists' >&2; fi
}
"$scripts/activate-release.sh" "$release_id" "$map_root"
if ! docker compose --env-file "$env_file" -f "$compose" up -d --force-recreate --wait; then restore; exit 1; fi
if ! "$scripts/accept-release.sh"; then restore; exit 1; fi
echo "release healthy: $release_id"
