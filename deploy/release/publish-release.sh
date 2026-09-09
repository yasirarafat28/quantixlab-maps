#!/usr/bin/env bash
set -euo pipefail
[[ $# -eq 3 ]] || { echo "usage: $0 RELEASE_ID MAP_ROOT S3_URI" >&2; exit 64; }
release_id="$1"; release="$(realpath "$2/releases/$release_id")"; destination="${3%/}/$release_id.tar.zst"
[[ "$destination" =~ ^s3://[^/]+/ ]] || { echo 'S3_URI must target an R2 bucket' >&2; exit 64; }
for command_name in aws sha256sum tar zstd; do command -v "$command_name" >/dev/null || { echo "missing: $command_name" >&2; exit 69; }; done
(cd "$release" && sha256sum --check SHA256SUMS)
archive="$(mktemp -t quantixlab-maps.XXXXXX.tar.zst)"; trap 'rm -f "$archive"' EXIT
tar -C "$(dirname "$release")" -cf - "$release_id" | zstd -T0 -10 >"$archive"
aws s3 cp "$archive" "$destination" --endpoint-url "${R2_ENDPOINT:?set R2_ENDPOINT}" --no-progress --checksum-algorithm SHA256
echo "published: $destination"
