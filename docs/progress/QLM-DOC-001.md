---
title: Maps Operations and Consumer Documentation
date: 2026-09-11
status: Complete
owner: @yasir
nextTask: TourBond gateway adapter
---

### What/Why/Where
- What: Document production maintenance, dataset refresh/country expansion, API use, and project onboarding.
- Why: Operators and new Quantix Lab projects need one verified procedure for maintaining and consuming the service.
- Where: `README.md`, `docs/data-releases.md`, `docs/operations.md`, `docs/api-reference.md`,
  `docs/consumer-onboarding.md`, deployment defaults, and the production deployment runbook.

### Solution
Expanded the existing documentation around the implemented OpenAPI contract and immutable release tooling. The
guides now separate liveness, readiness, provider diagnosis, and end-to-end acceptance; document update, expansion,
rollback, TLS, backup, privacy, and capacity procedures; and define secure consumer onboarding with publishable and
server keys. Corrected the migration alias to the deployed first-level hostname.

### Next
Adapt TourBond's legacy direct Photon/Valhalla provider to the authenticated Quantix Maps `/v1` server API.
