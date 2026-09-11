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
- Aligned the ordinary CI container builds with the pinned inputs proven by the successful `v1.0.3` image release.
- Added the regional tilemaker bounding box and SSD-backed store after the first Ubuntu build exposed the missing
  shapefile boundary, and corrected project-file ownership plus writable release/artifact directory guidance.
- Added a checksummed tilemaker coastline/landcover artifact pipeline after production logs proved those resources
  are intentionally external to the container; optional Valhalla live-traffic warnings remain non-blocking.
- Disabled Valhalla's long-running HTTP service during offline graph generation so a successful build returns control
  to the release pipeline and proceeds to Photon import.
- Fixed the Photon runtime image's `/app` directory permissions and added a non-root readability assertion, preventing
  `Unable to access jarfile /app/photon.jar` during import and service startup.
- Split Photon import/finalization into a validated resumable stage so downstream failures do not require rebuilding
  the completed vector tiles and Valhalla graph.
- Quoted comma-containing tmpfs mount specifications so production Compose can create the gateway, Martin, and
  Valkey services.
- Assigned the private Valkey ACL file to the official container UID/GID while retaining restrictive permissions.
- Made activation retries idempotent so a failed service startup can be retried without re-hashing Photon runtime
  state that changed after the release passed its initial integrity gate.
- Removed the invalid explanatory comment from the Valkey ACL template and documented its rule-only format.
- Corrected the pinned Valkey 8.1.3 health check to use its supported `REDISCLI_AUTH` environment variable.
- Corrected the Caddy log block syntax and added an edge health check that detects configuration crash loops.
- Added pinned-image Caddyfile validation to CI.
