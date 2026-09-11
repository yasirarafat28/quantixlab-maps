---
title: Correct provider acceptance failures
date: 2026-09-11
task: QLM-BUG-002
---

- Forward complete monotonic GPS timestamps to Valhalla with its required timestamp controls.
- Use Caddy's confirmed IPv4 admin listener for container health checks.
- Validate only reverse-geocode coordinates against the strict regional coordinate schema.
- Store parsed GET parameters in response-local state instead of assigning to Express 5's read-only `req.query`.
- Use a realistic road-following GPS trace in release acceptance so samples stay within Valhalla's 2 km breakage limit.
- Correct the release acceptance matrix fixture's `jq` arithmetic syntax.
- Respect `Retry-After` with bounded retries when regional acceptance reaches normal per-operation quotas.
- Accepted the digest-pinned `v1.0.14` deployment across all six containers and all 18 regional country fixtures.
