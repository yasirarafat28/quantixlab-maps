---
title: QLM-BUG-001 Valkey Rate-Limit ACL
date: 2026-09-11
status: Complete
owner: @yasir
nextTask: Production gateway recovery
---

### What/Why/Where
- What: Grant the gateway the missing Valkey command used by its token-bucket script.
- Why: Valid keys can read the catalog, but every rate-limited API and asset request returns HTTP 503.
- Where: Valkey ACL template, deployment contract coverage, and production recovery documentation.

### Solution
Add `HMGET` to the `maps-gateway` ACL and automatically verify that every Redis command used by gateway rate limits,
concurrency controls, response caching, and usage accounting is present in the deployment ACL.
The full suite passes (8 files, 18 tests), together with lint, type-checking, and whitespace validation.

### Next
Diagnose the independent Photon geocoding failure and Valhalla timestamp translation failure.

Production evidence confirms the host ACL contains `+hmget`, Valkey and gateway are healthy, and authenticated routing
and asset requests have recovered.
