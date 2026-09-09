# TourBond migration record

Initial standalone assets were adapted from TourBond backend commit
`f20b727377782c49f7af5e6fb0614a1b9641c6c1` and Flutter integration baseline
`b89617ecdbeca9747c8f8a408271b92fe8c880b0` on 2026-09-09.

Imported concepts include the 18-country bounds, Photon 1.2.1 build, Valhalla 3.8.0 runtime, architecture-specific
Tilemaker digests, light/dark style foundations, and atomic release scripts. They were rewritten for the normalized
Quantix Lab API, mandatory gateway asset authorization, multilingual glyph artifacts, project quotas, usage, and the
canonical domain. Run `sha256sum deploy/maps/* deploy/release/*` at the release tag and attach that output to the
migration acceptance record.

TourBond's existing `deploy/maps` remains intact until standalone rollback and production acceptance pass. Migration
then creates publishable and server credentials, changes backend provider calls, injects the asset header only for
`maps.quantixlab.dev`, and keeps TourBond's current `/api/v1/maps/*` mobile contract. The compatibility alias remains
for 90 days after production cutover.
