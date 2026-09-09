#!/usr/bin/env bash
set -euo pipefail
variables=(GATEWAY_IMAGE MARTIN_IMAGE PHOTON_IMAGE VALHALLA_IMAGE VALKEY_IMAGE CADDY_IMAGE)
for name in "${variables[@]}"; do
  value="${!name:-}"
  [[ "$value" =~ ^[^[:space:]]+@sha256:[a-f0-9]{64}$ ]] || { echo "$name must be pinned to a real sha256 digest" >&2; exit 64; }
done
echo 'all runtime images are digest pinned'
