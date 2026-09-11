---
title: QLM-MAP-001 Independent Maps Platform
date: 2026-09-09
status: In Progress
owner: @yasir
nextTask: Ubuntu dataset build and production acceptance
---

### What/Why/Where
- What: Build the standalone Quantix Lab map presentation and navigation platform.
- Why: Reuse one controlled maps service across Quantix Lab projects without coupling it to TourBond.
- Where: Gateway, deployment, release pipeline, OpenAPI, SDKs, tests, and operator documentation in this repository.

### Solution
The v1 gateway, project credentials, limits, usage, provider adapters, observability, digest-enforced Compose stack,
immutable release/rollback tooling, API contract, Dart/TypeScript clients, CI, and operating guides are implemented.
TourBond infrastructure remains unchanged. Production data and performance acceptance are intentionally Ubuntu-only.
Local verification passes TypeScript lint/typecheck/build, 17 tests, OpenAPI/SDK generation, Dart analysis, dependency
audit, shell syntax, and Compose configuration. Container/data builds were not run on the capacity-limited workstation.
The first `v1.0.0` image run exposed an invalid Trivy Action reference before either image built; the workflow now
pins the verified `v0.36.0` release commit and requires a new immutable deployment-candidate tag.
The `v1.0.1` run then rejected Photon 1.2.1 vulnerabilities. Photon is now built from the exact upstream dependency
fix commit `8477811`, retaining the HIGH/CRITICAL gate and allowing both matrix jobs to report independently.
The `v1.0.2` run passed Photon and showed the gateway application dependencies clean, but rejected stale Debian
packages and unused npm tooling in the old runtime base. The gateway now refreshes its pinned Node 22 base, applies
Debian security upgrades, and removes npm, Corepack, and Yarn from production while retaining the scan gate.
The `v1.0.3` release built both images, passed the HIGH/CRITICAL gates, and produced attestations. Its separate main
CI run exposed stale container-build arguments; CI now uses the same pinned Node, JDK, and JRE inputs as release CI.
The VPS runbook now covers purchase gates, DNS/firewall/SSH hardening, official Docker installation, protected
configuration, containerized project administration, data build/archive, rollout, acceptance, and TourBond cutover.
The README documents ongoing project onboarding, least-privilege keys, quotas, rotation, revocation, health, backups,
updates, and incident rollback.
Release verification now excludes generated package build output consistently, preventing the root lint command from
re-linting emitted JavaScript with the wrong environment assumptions.
The deployment examples now use the confirmed personal GitHub/GHCR namespace `yasirarafat28`; the public product
domain and package names remain under the Quantix Lab brand.
The first Ubuntu dataset attempt preserved all verified inputs but exposed a missing tilemaker bounding box. Regional
tile generation now supplies the release bounds and uses an on-disk store to reduce peak memory on the 48 GiB host.
Operator guidance also preserves gateway-readable ownership after atomic project configuration writes.
The retry proved Valhalla's missing `traffic.tar` warning harmless but exposed tilemaker's separately distributed
coastline/landcover inputs. A reproducible helper now snapshots those sources and the build verifies their bundle.
The offline Valhalla invocation now disables its server after graph generation so the release pipeline exits and
continues to Photon instead of remaining attached to a successfully built routing service.
The first Photon import exposed an image-layer permission defect: BuildKit created `/app` without directory execute
bits. The runtime image now creates `/app` as `0755` and verifies JAR readability as the non-root Photon user.
Photon import/finalization is now an independently resumable stage, preserving successfully completed PMTiles and
Valhalla outputs after a downstream image or import failure.
The first production rollout exposed unquoted comma-containing tmpfs options being split by YAML into a mount path.
The runtime stack now quotes each tmpfs specification for gateway, Martin, and Valkey.
The same rollout showed that the non-root Valkey image needs ownership of its ACL bind mount; the VPS setup now assigns
that file to the image's fixed UID/GID 999 while retaining mode `0600`.
Idempotent rollout retries now recognize an already-active release instead of re-checking Photon files that its search
runtime legitimately changes after first activation.
The Valkey ACL template no longer embeds a comment line, which Valkey 8.1 rejects because ACL files must contain user
rules only.
The Valkey 8.1.3 health check now uses its supported `REDISCLI_AUTH` compatibility variable; the newer
`VALKEYCLI_AUTH` name is unavailable in that pinned version and caused unauthenticated probes.
The Caddy log directive now uses valid multiline syntax, and the edge service has an admin-API health check so a
configuration crash loop cannot be reported as a successful Compose startup. CI validates the Caddyfile with the
pinned production image before a deployment candidate is accepted.

### Next
Rebuild `2026-09-09.1` with the corrected tile bounds on Ubuntu, run regional/device/load acceptance, then migrate
TourBond and begin the 90-day alias window.
