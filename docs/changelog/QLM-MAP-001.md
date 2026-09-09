# QLM-MAP-001 — Standalone platform foundation

Date: 2026-09-09

- Added normalized assets, geocoding, route, match, matrix, catalog, usage, health, metrics, and documentation APIs.
- Added scoped publishable/server credentials, atomic file reload, rotation/revocation CLI, Valkey limits and usage.
- Added private provider networking, Caddy canonical/compatibility domains, digest-enforced container configuration.
- Added immutable regional builds, multilingual Photon/font preparation, R2 publishing, acceptance, and rollback.
- Added generated OpenAPI and TypeScript types, Dart/TypeScript clients, CI, image provenance, tests, and operations docs.
- Kept large regional artifacts and the existing TourBond maps lifecycle out of scope for local mutation.
- Expanded the Ubuntu runbook into a gated, command-oriented VPS bootstrap, deployment, and acceptance procedure.
- Added README operator guidance for project onboarding, quotas, key rotation/revocation, updates, health, backup,
  release management, and rollback.
- Corrected the repository lint boundary so generated package distributions are excluded at every nesting level.
- Aligned Git, Dart dependency, and GHCR examples with the confirmed `yasirarafat28` repository namespace.
- Repaired the image workflow after the first tag exposed an invalid Trivy Action reference, pinning verified
  Trivy Action `v0.36.0` by its immutable commit SHA.
- Replaced the vulnerable Photon 1.2.1 binary with a reproducible build of upstream dependency-fix commit `8477811`
  and disabled matrix fail-fast so both image security results remain visible.
- Refreshed the pinned Node 22 gateway base, applied Debian security upgrades, and removed unused npm, Corepack,
  and Yarn tooling from the production image after the `v1.0.2` scan isolated those findings from the clean app.
