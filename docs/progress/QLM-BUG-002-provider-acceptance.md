---
title: QLM-BUG-002 Provider Acceptance Failures
date: 2026-09-11
status: In Progress
owner: @yasir
nextTask: Production provider recovery
---

### What/Why/Where
- What: Correct Valhalla trace timestamps and the Caddy health probe, then isolate the remaining Photon gateway error.
- Why: Live acceptance passes catalog, routes, and assets, but timestamped matching returns 422, geocoding returns 503,
  and Caddy is falsely unhealthy while serving traffic.
- Where: Valhalla adapter, Compose health check, provider/deployment tests, and operations documentation.

### Solution
Send Valhalla the required `begin_time` and `use_timestamps` controls only for a complete monotonic timestamp series.
Probe Caddy's confirmed IPv4 admin listener directly and validate reverse-geocode coordinates without passing extra
query fields into a strict coordinate schema. All 23 tests, lint, type-checking, build, OpenAPI generation, SDK
generation, and whitespace validation pass. The deployed Photon adapter, response schema, and cache all pass;
forward geocoding failed because Express 5 exposes `req.query` as read-only, so validated query data now uses
response-local state instead.

### Next
Publish corrected immutable gateway candidate `v1.0.14` and complete live acceptance.
