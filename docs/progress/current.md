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
The VPS runbook now covers purchase gates, DNS/firewall/SSH hardening, official Docker installation, protected
configuration, containerized project administration, data build/archive, rollout, acceptance, and TourBond cutover.
The README documents ongoing project onboarding, least-privilege keys, quotas, rotation, revocation, health, backups,
updates, and incident rollback.
Release verification now excludes generated package build output consistently, preventing the root lint command from
re-linting emitted JavaScript with the wrong environment assumptions.
The deployment examples now use the confirmed personal GitHub/GHCR namespace `yasirarafat28`; the public product
domain and package names remain under the Quantix Lab brand.

### Next
Resolve published gateway/Photon image digests, approve the font and Photon sources, build `YYYY-MM-DD.N` on the new
Ubuntu server, run regional/device/load acceptance, then migrate TourBond and begin the 90-day alias window.
