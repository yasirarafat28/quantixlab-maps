# Production operations handbook

Task: QLM-DOC-001

Traffic flows `Cloudflare -> Caddy -> gateway`; the gateway privately reaches Martin (tiles), Photon (geocoding),
Valhalla (routing/matching/matrices), and Valkey (limits/usage). Never expose ports 2322, 3000, 6379, 8002, or 8080.
Canonical: `https://maps.quantixlab.dev`; compatibility: `https://tourbond-maps.quantixlab.dev`.

## Daily checks

```bash
cd /opt/quantixlab-maps
docker compose --env-file /etc/quantixlab-maps/deploy.env -f deploy/compose.yaml ps
curl -fsS https://maps.quantixlab.dev/health/live | jq
set -a; source /etc/quantixlab-maps/maps.env; set +a
curl -fsS -H "Authorization: Bearer $OPERATOR_TOKEN" \
  http://127.0.0.1:8080/internal/health/ready | jq
curl -fsS -H "Authorization: Bearer $OPERATOR_TOKEN" \
  http://127.0.0.1:8080/internal/metrics | head
df -h /srv/quantixlab-maps /var/lib/docker
docker stats --no-stream
```

Liveness proves only the gateway responds; readiness checks dependencies. All six services must be `Up` and healthy.
Investigate restarts, readiness failure, low disk, unexpected 5xx, sustained 429s, OOMs, or rising latency.

## Provider diagnosis

```bash
docker exec quantixlab-maps-martin-1 wget -qO- http://localhost:3000/catalog
docker exec quantixlab-maps-photon-1 wget -qO- http://localhost:2322/status
docker exec quantixlab-maps-valhalla-1 curl -fsS http://localhost:8002/status
docker inspect --format '{{.State.Health.Status}} {{.RestartCount}}' quantixlab-maps-valkey-1
docker compose --env-file /etc/quantixlab-maps/deploy.env -f deploy/compose.yaml \
  logs --since=15m gateway caddy martin photon valhalla valkey
```

Do not infer a stuck build from an old terminal line. Compare timestamped logs, CPU, disk growth, and state. Use
`tmux capture-pane -pt <session> -S -100` for detached builds.

## End-to-end acceptance

Run after every data, gateway, image, DNS, TLS, or key-policy change:

```bash
cd /opt/quantixlab-maps
export MAP_PUBLIC_BASE_URL=https://maps.quantixlab.dev
read -rsp 'Publishable key: ' PUBLISHABLE_KEY; echo; export PUBLISHABLE_KEY
read -rsp 'Server key: ' SERVER_KEY; echo; export SERVER_KEY
deploy/release/accept-release.sh
unset PUBLISHABLE_KEY SERVER_KEY
```

It tests styles, TileJSON, a vector tile, fonts, sprites, three route profiles, matching, matrices, and geocoding.
Success ends with `public release acceptance passed`.

## Style-only release

Legacy labels can be updated without rebuilding PMTiles. Build an immutable style overlay, set `MAP_STYLES_DIR` to
the printed directory, validate Compose, and recreate only `gateway`. Do not edit the active dataset's `styles`
directory. Keep the previous deploy environment backup until public acceptance succeeds. The v2 files are published
side by side but remain disabled in consumers until a compatible regional tile release passes device acceptance.

## DNS and TLS

Both records are proxied. Apply a hostname-scoped Cloudflare Configuration Rule with SSL `Strict`; do not alter the
zone-wide Flexible mode used elsewhere. Free Universal SSL covers `tourbond-maps.quantixlab.dev`, not the deeper
`maps.tourbond.quantixlab.dev`. Caddy names come from `MAP_DOMAIN` and `MAP_COMPAT_DOMAIN` in `deploy.env`.

- `521`: origin unreachable; inspect Caddy, ports, and firewall.
- `525`: origin TLS failed; compare DNS hostname, Caddy environment, and certificate logs.
- Identical `308` loop: Cloudflare is likely using Flexible for the hostname.
- Pre-HTTP handshake failure: verify Cloudflare edge-certificate coverage.

## Credentials, privacy, and backups

Back up `/etc/quantixlab-maps` encrypted. Losing `MAP_KEY_HASH_SECRET` invalidates keys; losing `projects.json` loses
authorization state. Rotate server keys with overlap: deploy the replacement, verify, then revoke the old key. Never
expose `qlm_sk_` to browser/mobile clients or put any token in URLs or logs.

Logs may contain request ID, project ID, operation, status, latency, bytes, and dataset version. They must not contain
tokens, hashes, IPs, full URLs, search text, coordinates, traces, bodies, or provider responses. Usage totals remain in
Valkey for 35 days independently of logs.

Back up configuration, active/previous manifests and checksums, Git tag, image digests, and R2 inventory. Quarterly,
restore to an isolated host, validate checksums, start without public DNS, and run acceptance.

## Rollback

Stop concurrent changes and preserve evidence. Roll out a known accepted release:

```bash
cd /opt/quantixlab-maps
read -rsp 'Publishable key: ' PUBLISHABLE_KEY; echo; export PUBLISHABLE_KEY
read -rsp 'Server key: ' SERVER_KEY; echo; export SERVER_KEY
deploy/release/rollout-release.sh PREVIOUS_RELEASE_ID /srv/quantixlab-maps \
  /etc/quantixlab-maps/deploy.env
unset PUBLISHABLE_KEY SERVER_KEY
```

For software regressions, use the prior reviewed tag and image digests, validate, and recreate. Never mutate release
contents or use `git reset --hard` as rollback.

## Performance gate

Run 100 mixed consumers for 15 minutes with `k6 run tests/performance/k6.js`. Targets: gateway overhead under 50 ms
p95, search under 800 ms, route under 2 s, 200-point match under 3 s, and 10x10 matrix under 5 s. Unexpected 5xx must
remain below 1%, with no swap, OOM, unbounded queue, or missing metrics. Use and then revoke a load-test project.
