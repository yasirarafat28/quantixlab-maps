# Operations

## Health and metrics

`/health/live` is public and proves only that the gateway process responds. From the host, call
`http://127.0.0.1:8080/internal/health/ready` and `/internal/metrics` with the operator Bearer token. Alert on any
provider readiness failure, unexpected 5xx, rate-limit surge, dataset age, disk pressure, container restart, or
latency gate regression.

Logs contain request ID, project ID, bounded operation, status, latency, byte count, and dataset version. They must
never contain keys, hashes, IP addresses, full query URLs, search text, coordinates, traces, bodies, or provider
response bodies. Usage totals live in Valkey for 35 days and are independent from log retention.

## Routine work

- Validate credential changes before relying on reload: `npm run cli -- config validate`.
- Rotate server keys with a 24-hour overlap, deploy the consumer secret, verify it, then revoke the old key.
- Build data monthly in a new release directory. Never mutate `current` or a Photon index.
- Confirm the R2 archive and checksum inventory before activation.
- Retain active and previous releases locally; delete older releases only after backup and rollback evidence.
- Back up `/etc/quantixlab-maps` encrypted. Losing `MAP_KEY_HASH_SECRET` invalidates every stored credential hash.

## Performance acceptance

Run 100 concurrent mixed consumers for 15 minutes. Required p95: gateway overhead below 50 ms; search below 800 ms;
route below 2 seconds; 200-point match below 3 seconds; 10×10 matrix below 5 seconds. Unexpected 5xx must stay below
1%, with no swap, OOM, unbounded queue, or missing metrics. Record host specification and dataset release with results.
Run `k6 run tests/performance/k6.js` with a dedicated load-test project and temporary quotas high enough not to turn
the test into a rate-limit test; revoke its keys and restore quotas afterward. Measure gateway-only overhead from
gateway/provider histograms rather than client round-trip duration.

## Incident rollback

Stop new release work, preserve logs without sensitive payloads, point `current` to the previous release atomically,
and recreate containers with `docker compose --env-file /etc/quantixlab-maps/deploy.env -f deploy/compose.yaml up -d
--force-recreate --wait`. Run `accept-release.sh` before closing the incident.
