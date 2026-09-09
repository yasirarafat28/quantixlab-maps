# Quantix Lab Maps

Independent, self-hosted maps, geocoding, routing, trace matching, and matrices for Quantix Lab projects.

- Canonical API: `https://maps.quantixlab.dev/v1`
- Interactive API documentation: `https://maps.quantixlab.dev/docs`
- Data: OpenStreetMap contributors, ODbL 1.0
- Runtime: Node.js gateway, Martin, Photon, Valhalla, Valkey, and Caddy

The platform is designed for one independent deployment shared by multiple Quantix Lab projects. Public map assets
use revocable publishable keys; geocoding, routing, matching, matrices, and usage require server keys.

## Start here

- New VPS: [Ubuntu production deployment](docs/deployment.md)
- Credentials and scopes: [authentication](docs/authentication.md)
- Dataset builds: [data releases](docs/data-releases.md)
- Monitoring, load gates, and rollback: [operations](docs/operations.md)
- Endpoint contract: [API reference](docs/api-reference.md)
- Consumer examples: [Dart/Flutter](docs/integration-dart.md) and
  [TypeScript/backend](docs/integration-typescript.md)

Production releases are immutable, named `YYYY-MM-DD.N`, and built only on the Ubuntu map host. Never commit PBF,
PMTiles, Photon indexes, Valhalla graphs, glyph archives, real environment files, or credentials.

## Operator CLI

On the VPS, enter a root shell, load the reviewed deployment environment, and define the containerized CLI:

```bash
sudo -i
cd /opt/quantixlab-maps
set -a
source /etc/quantixlab-maps/deploy.env
source /etc/quantixlab-maps/maps.env
set +a
map_cli() { docker run --rm --user 0:0 --env-file /etc/quantixlab-maps/maps.env \
  -v /etc/quantixlab-maps:/etc/quantixlab-maps "$GATEWAY_IMAGE" node dist/cli/index.js "$@"; }
map_cli config validate
map_cli project list
```

The CLI writes `/etc/quantixlab-maps/projects.json` atomically with mode `0600`. The gateway reloads valid changes
on the next authenticated request and retains its last valid configuration if a reload is invalid.

### Add a project

Use a stable lowercase ID. Create only the scopes the project needs:

```bash
map_cli project create delivery-app --name 'Delivery App'
map_cli key create delivery-app --type publishable --scopes assets:read
map_cli key create delivery-app --type secret --scopes geocode:read,route:read
map_cli quota set delivery-app assets 1200
map_cli quota set delivery-app geocode 120
map_cli quota set delivery-app route 60
map_cli config validate
```

Each key is printed exactly once. Store it immediately in the consumer's secret manager. A publishable key may be
shipped in a client but must be restricted to the exact canonical hostname. A server key must never enter a mobile
app, browser bundle, URL, log, ticket, chat, or repository.

Inspect non-secret key metadata and copy the key ID needed for rotation/revocation:

```bash
jq '.projects[] | select(.id=="delivery-app") | .keys[] |
  {id,type,scopes,createdAt,expiresAt,revokedAt}' /etc/quantixlab-maps/projects.json
```

### Rotate a key

Rotate with an overlap, deploy the new token, verify real traffic, and then revoke the old key:

```bash
map_cli key rotate delivery-app REPLACE_OLD_KEY_ID --overlap-hours 24
map_cli config validate
# Put the one-time token in the consumer secret manager, deploy, and verify.
map_cli key revoke delivery-app REPLACE_OLD_KEY_ID
```

Never delete key history from `projects.json`; revocation records are operational evidence.

### Revoke access

For one leaked or retired credential:

```bash
map_cli key revoke delivery-app REPLACE_KEY_ID
map_cli config validate
```

To remove all access, revoke every active key returned by the metadata query. Confirm old tokens receive `401`.
Do not reuse the project ID for a different customer or application. Preserve the disabled credential history and
usage evidence according to retention policy.

### Change quotas and inspect usage

```bash
map_cli quota set delivery-app route 30
map_cli quota set delivery-app matrix 5
curl -fsS -H 'Authorization: Bearer REPLACE_SERVER_KEY' \
  'https://maps.quantixlab.dev/v1/usage' | jq
```

Quotas are positive per-minute limits. Supported operations are `assets`, `geocode`, `route`, `match`, `matrix`, and
`usage`. Raise limits temporarily for an approved load test, then restore them and revoke the load-test keys.

## Release and update workflow

For every gateway or configuration release:

1. Merge reviewed code, pass CI, and create a signed version tag.
2. Wait for gateway/Photon image publication and vulnerability scanning.
3. Copy the exact multi-architecture image digests into `/etc/quantixlab-maps/deploy.env`.
4. Run `deploy/release/verify-images.sh` and `docker compose ... config --quiet`.
5. Back up `/etc/quantixlab-maps`, pull images, recreate the stack, and check readiness and metrics.
6. Keep the prior Git tag, image digests, and dataset release available for rollback.

For monthly data updates, use [data releases](docs/data-releases.md): preflight, build a new immutable release,
publish it to R2, roll it out, and archive acceptance evidence. Never edit `current` or an active Photon index.

## Health, backup, and emergency response

```bash
curl -fsS https://maps.quantixlab.dev/health/live
curl -fsS -H "Authorization: Bearer $OPERATOR_TOKEN" \
  http://127.0.0.1:8080/internal/health/ready | jq
curl -fsS -H "Authorization: Bearer $OPERATOR_TOKEN" \
  http://127.0.0.1:8080/internal/metrics
docker compose --env-file /etc/quantixlab-maps/deploy.env -f deploy/compose.yaml ps
docker compose --env-file /etc/quantixlab-maps/deploy.env -f deploy/compose.yaml logs --since=15m
```

Back up `/etc/quantixlab-maps` encrypted and test restoration. Losing `MAP_KEY_HASH_SECRET` invalidates every key;
losing `projects.json` loses all project authorization state. Keep active and previous data releases locally and in
the private archive.

If a release fails, stop changes, preserve privacy-safe logs, and roll out the previous `YYYY-MM-DD.N`. The rollout
script automatically restores the previous symlink after failed health or acceptance. Follow [operations](docs/operations.md)
for incident and load-test requirements.

## Development

```bash
cp .env.example .env
npm ci
npm run check
```

The gateway can run without providers for liveness and contract tests. A real dataset is required for readiness.
