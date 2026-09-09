# Data releases

Releases are immutable and named `YYYY-MM-DD.N`. Each includes source extracts/checksums, merged regional PBF,
PMTiles, Valhalla graph/admin/time-zone data, filtered Photon index, glyphs/licenses, styles, sprites, manifest,
and `SHA256SUMS`. At least active and previous releases stay local; archives are uploaded to private R2 storage.

```bash
deploy/release/prepare-tilemaker-assets.sh 2026-09-09.1 /srv/quantixlab-maps/artifacts
sudo -E deploy/release/preflight.sh /srv/quantixlab-maps
sudo -E deploy/release/build-release.sh 2026-09-09.1 /srv/quantixlab-maps
sudo -E deploy/release/publish-release.sh 2026-09-09.1 /srv/quantixlab-maps s3://quantixlab-map-artifacts/releases
sudo -E deploy/release/rollout-release.sh 2026-09-09.1 /srv/quantixlab-maps /etc/quantixlab-maps/deploy.env
```

The build requires approved digest-pinned Photon and Valhalla images, immutable Photon and glyph artifacts, and the
tilemaker coastline/landcover bundle created by `prepare-tilemaker-assets.sh`. The helper snapshots official OSM
water polygons and Natural Earth inputs, records each source SHA-256 and license, and emits one checksum-pinned
archive. The build verifies every artifact and records its checksum plus tool images in the release manifest.

Rollout validates the inventory, atomically swaps `current`, waits for Compose health, and runs public acceptance for
all 18 countries. Any failure restores the previous symlink and containers. Photon is always imported into the new
release and never updated in place. Monthly execution requires an operator review of sources, checksums, image
digests, capacity, acceptance evidence, and the R2 upload before activation.

MapLibre's standard remote SDF glyph pipeline has known complex-text-layout limitations for scripts including
Bengali, Devanagari, Myanmar, and Tamil. The release still supplies their Unicode glyph ranges, but production
approval requires device inspection of shaping and fallback behavior. API/geocoder language support is independent
of this renderer limitation; do not claim fully correct local-script map labels until each client passes inspection.
