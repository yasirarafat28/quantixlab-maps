---
title: Restore rate-limited gateway operations
date: 2026-09-11
task: QLM-BUG-001
---

- Granted `HMGET`, which is called by the token-bucket Lua script, in the production `maps-gateway` ACL template.
- Added a deployment-contract test covering every command and key pattern used by the gateway's Valkey features.
- Documented the existing-host ACL repair requirement and verified all 18 tests, lint, and type-checking.
