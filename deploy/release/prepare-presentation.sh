#!/usr/bin/env bash
set -euo pipefail

[[ $# -eq 2 ]] || { echo "usage: $0 RELEASE_DIR PUBLIC_BASE_URL" >&2; exit 64; }
target="$1"; public_url="${2%/}"; scripts="$(cd "$(dirname "$0")" && pwd)"
[[ "$public_url" =~ ^https:// ]] || { echo 'PUBLIC_BASE_URL must use HTTPS' >&2; exit 64; }
: "${FONT_BUNDLE_URL:?set immutable Noto glyph bundle URL}"
: "${FONT_BUNDLE_SHA256:?set Noto glyph bundle SHA-256}"
mkdir -p "$target/fonts" "$target/styles" "$target/sprites"
curl --fail --location --retry 4 --continue-at - --output "$target/font-bundle.tar.zst" "$FONT_BUNDLE_URL"
echo "$FONT_BUNDLE_SHA256  $target/font-bundle.tar.zst" | sha256sum --check -
tar --use-compress-program=unzstd -xf "$target/font-bundle.tar.zst" -C "$target/fonts"
[[ -f "$target/fonts/LICENSES.json" && -f "$target/fonts/Noto Sans Regular/0-255.pbf" ]] || {
  echo 'font bundle is missing licenses or required glyphs' >&2; exit 65;
}
for script in Latin Bengali Devanagari Arabic Sinhala Tamil Myanmar Thai Khmer Lao Chinese Thaana; do
  jq -e --arg script "$script" '.scripts | index($script)' "$target/fonts/LICENSES.json" >/dev/null || { echo "font bundle lacks $script coverage" >&2; exit 65; }
done
for theme in light dark; do
  sed "s|__MAP_PUBLIC_BASE_URL__|$public_url|g" "$scripts/../maps/style-$theme.template.json" >"$target/styles/$theme.json"
  jq -e '.version == 8 and .sources.region and .glyphs' "$target/styles/$theme.json" >/dev/null
done
printf '{}' >"$target/sprites/default.json"
printf 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+X8j0WQAAAABJRU5ErkJggg==' | base64 -d >"$target/sprites/default.png"
rm "$target/font-bundle.tar.zst"
