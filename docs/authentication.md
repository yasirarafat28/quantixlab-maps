# Authentication

Presentation resources use a publishable token:

```http
X-Quantix-Maps-Key: qlm_pk_<key-id>_<secret>
```

Compute APIs use a server key and must never be called directly from a mobile or browser binary:

```http
Authorization: Bearer qlm_sk_<key-id>_<secret>
```

Never put either key in a URL. Publishable tokens are identifiers with asset-only scope, per-token/IP limits, and
revocation; they are not confidential. Server keys are secrets. The available scopes are `assets:read`,
`geocode:read`, `route:read`, `match:read`, `matrix:read`, and `usage:read`.

The source of truth is `/etc/quantixlab-maps/projects.json`, owned by root and mode `0600`. It contains key IDs and
HMAC-SHA-256 hashes only. `MAP_KEY_HASH_SECRET` is stored separately in `maps.env`. The gateway parses by key ID,
compares hashes in constant time, and atomically retains its prior in-memory configuration if a reload is invalid.

Define the containerized `map_cli` function from the README on the production host, then run:

```bash
map_cli project create tourbond --name TourBond
map_cli key create tourbond --type publishable --scopes assets:read
map_cli key create tourbond --type secret --scopes geocode:read,route:read,match:read,matrix:read,usage:read
map_cli key rotate tourbond KEY_ID --overlap-hours 24
map_cli key revoke tourbond KEY_ID
map_cli quota set tourbond route 60
map_cli config validate
```

Each newly created secret is printed once. Store it immediately in the consumer's secret manager. Rotation sets the
old key's expiry and creates a replacement; revocation is effective after the next request-triggered config reload.
