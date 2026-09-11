# Dataset maintenance and country expansion

Task: QLM-DOC-001

Production datasets are immutable releases named `YYYY-MM-DD.N`. Never edit `current`, a running Photon index,
PMTiles, or a Valhalla graph in place.

## Release inventory

Each `/srv/quantixlab-maps/releases/<release-id>` contains source extracts/checksums, `region.osm.pbf`, PMTiles,
Valhalla graph/admin/time-zone data, Photon index, styles, glyphs, sprites, licenses, `manifest.json`, and
`SHA256SUMS`. Keep the active and previous release locally and archive every accepted release privately.

Current coverage is `BD IN PK NP BT LK MM ID PH TH MY SG VN KH LA BN TL MV`. Geofabrik inputs live in
`deploy/release/build-release.sh`; API country codes, bounds, and languages in `src/contracts/constants.ts`;
acceptance locations in `deploy/release/fixtures.json`. These must agree.

## Refresh existing countries

1. Choose a new ID, normally the UTC build date plus `.1`.
2. Confirm at least 300 GiB free and room for active plus candidate releases.
3. Review upstream dates, artifact checksums, pinned image digests, and host capacity.
4. Build in `tmux`, archive, roll out, and retain evidence.

```bash
sudo -i
cd /opt/quantixlab-maps
tmux new -s maps-build
set -a; source /etc/quantixlab-maps/deploy.env; set +a
export MIN_FREE_GIB=300 MAP_PUBLIC_BASE_URL=https://maps.quantixlab.dev
export PHOTON_DUMP_URL='REPLACE_IMMUTABLE_URL' PHOTON_DUMP_SHA256='REPLACE_SHA256'
export FONT_BUNDLE_URL='REPLACE_IMMUTABLE_URL' FONT_BUNDLE_SHA256='REPLACE_SHA256'
export TILEMAKER_ASSETS_URL='REPLACE_IMMUTABLE_URL' TILEMAKER_ASSETS_SHA256='REPLACE_SHA256'
deploy/release/preflight.sh /srv/quantixlab-maps
deploy/release/build-release.sh 2026-10-01.1 /srv/quantixlab-maps
deploy/release/publish-release.sh 2026-10-01.1 /srv/quantixlab-maps \
  s3://quantixlab-map-artifacts/releases
```

Detach with `Ctrl+B`, then `D`; return with `tmux attach -t maps-build`. Check without attaching:

```bash
tmux capture-pane -pt maps-build -S -80
docker stats --no-stream
df -h /srv/quantixlab-maps
du -sh /srv/quantixlab-maps/releases/2026-10-01.1
```

Validate before activation:

```bash
cd /srv/quantixlab-maps/releases/2026-10-01.1
sha256sum -c SHA256SUMS
jq . manifest.json source-manifest.json >/dev/null
pmtiles verify tiles/region.pmtiles
```

Load acceptance keys without writing them to history, then roll out:

```bash
cd /opt/quantixlab-maps
read -rsp 'Publishable key: ' PUBLISHABLE_KEY; echo; export PUBLISHABLE_KEY
read -rsp 'Server key: ' SERVER_KEY; echo; export SERVER_KEY
deploy/release/rollout-release.sh 2026-10-01.1 /srv/quantixlab-maps \
  /etc/quantixlab-maps/deploy.env
unset PUBLISHABLE_KEY SERVER_KEY
```

Rollout verifies inventory, swaps `current` atomically, waits for health, and runs public acceptance. Failure restores
the previous release. Record source dates, manifest hash, image digests, duration, storage growth, acceptance result,
and archive location.

## Add or remove a country

Coverage changes require a code release followed by a data release:

1. Confirm the authoritative extract, exact Geofabrik slug, freshness, and license.
2. Change `countries` in `deploy/release/build-release.sh`.
3. Update country codes, bounds, and languages in `src/contracts/constants.ts`.
4. Update tilemaker `--bbox`; a small box omits data, while an excessive box wastes resources.
5. Add representative city/address coordinates to `deploy/release/fixtures.json`.
6. Update manifest fields in `deploy/release/resume-photon-release.sh`.
7. Update each consumer's product policy; available data does not automatically permit product use.
8. Regenerate contracts/SDKs, pass CI, tag images, and build a new dataset.

```bash
npm ci
npm run check
git diff -- openapi packages
```

Test geocode, reverse geocode, driving/bicycle/walking routes, matrix, map match, and a visible vector tile in every
added country. Inspect local scripts on devices; remote SDF glyphs have known complex-text shaping limitations.

## Software-only updates and recovery

Use a reviewed tag and digest-pinned images. Run `deploy/release/verify-images.sh`, validate Compose, back up
`/etc/quantixlab-maps`, recreate against unchanged `current`, then run `accept-release.sh`. Never use mutable tags.

If activation fails, preserve logs and the candidate. Confirm `current` points to the last accepted release and
recreate Compose. Delete only releases that are neither active nor previous and have a verified archive. Photon files
change after startup; integrity verification applies before first activation, not to the live index afterward.
