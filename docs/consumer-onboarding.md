# Consumer project onboarding

Task: QLM-DOC-001

Use one project identity per application/environment, for example `tourbond-production` and `tourbond-staging`.
Never share production keys across projects or environments.

## Operator setup

On the maps host, load the `map_cli` wrapper from the repository README and create least-privilege keys:

```bash
map_cli project create sample-production --name 'Sample Production'
map_cli key create sample-production --type publishable --scopes assets:read
map_cli key create sample-production --type secret \
  --scopes geocode:read,route:read,match:read,matrix:read,usage:read
map_cli quota set sample-production assets 1200
map_cli quota set sample-production geocode 120
map_cli quota set sample-production route 60
map_cli config validate
```

Tokens print once. Put the publishable token in the approved client configuration and the server token in the
backend's secret manager. Record non-secret project/key IDs, owner, purpose, environment, scopes, expiry, and rotation
date in the service inventory.

## Backend configuration

Recommended variables:

```dotenv
MAPS_BASE_URL=https://maps.quantixlab.dev
MAPS_SERVER_KEY=qlm_sk_REPLACE
MAPS_TIMEOUT_MS=5000
```

The backend calls geocoding, routes, matching, and matrices with `Authorization: Bearer`. It should expose only its
own authenticated product endpoints to mobile/web clients. Do not configure legacy native Photon or Valhalla URLs to
the gateway: their paths and response shapes differ from `/v1`.

## Client presentation configuration

```dotenv
MAPS_BASE_URL=https://maps.quantixlab.dev
MAPS_PUBLISHABLE_KEY=qlm_pk_REPLACE
MAPS_STYLE_URL=https://maps.quantixlab.dev/v1/styles/light.json
```

Configure the map renderer to attach `X-Quantix-Maps-Key` to style, TileJSON, tile, font, and sprite requests. Confirm
the chosen renderer reliably propagates headers to nested resources. Publishable keys are revocable identifiers, not
server secrets; still restrict their scope and quota.

## Acceptance checklist

- Catalog returns the expected dataset and country coverage.
- Light/dark styles load without missing tile, glyph, or sprite requests.
- Search and reverse search return expected local addresses.
- Driving, bicycle, and walking routes work where the product exposes them.
- Polyline6 is decoded correctly and attribution remains visible.
- 401, 403, 422, 429, and transient 5xx states have user-safe behavior.
- Logs contain request IDs but no keys, search text, coordinates, or response bodies.
- Staging and production use distinct projects and credentials.
- Server key is absent from mobile binaries, browser bundles, source control, and URLs.

## Rotation and offboarding

Rotate with overlap: create replacement, deploy, observe successful traffic, then revoke the previous key. For a leak,
revoke immediately and investigate usage. When retiring a project, revoke all active keys but preserve metadata and
usage evidence according to retention policy. See `docs/authentication.md` for commands and scopes.

## SDKs and contract updates

TypeScript and Dart reference clients are in `packages/`. Generate TypeScript types from the committed OpenAPI file:

```bash
npm run openapi:generate
npm run sdk:generate
npm run check
```

Consumers should pin an SDK release, test upgrades against staging, tolerate additive fields, and treat a new major
API path as a migration. The live Swagger UI is useful for discovery; production code should rely on the committed,
versioned OpenAPI contract.
