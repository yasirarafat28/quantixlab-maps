# Quantix Lab Maps API v1

Task: QLM-DOC-001

Base URL: `https://maps.quantixlab.dev`. Interactive Swagger UI: `/docs`. Machine-readable OpenAPI 3.1:
`/openapi.json`; the versioned source is `openapi/quantixlab-maps.v1.json`.

## Authentication

Presentation assets accept a project publishable key:

```http
X-Quantix-Maps-Key: qlm_pk_<id>_<secret>
```

Compute and usage endpoints require a server key:

```http
Authorization: Bearer qlm_sk_<id>_<secret>
```

Publishable keys may be embedded in an approved client and are limited to `assets:read`. Server keys are secrets and
belong only in a backend secret manager. Never include either key in a URL. Every project has independent scopes,
quotas, usage, rotation, and revocation.

## Common contract

Coordinates use `{ "latitude": number, "longitude": number }`; supported bounds are longitude 60–142 and latitude
-12–38. Countries: `BD IN PK NP BT LK MM ID PH TH MY SG VN KH LA BN TL MV`. Profiles: `DRIVING`, `BICYCLE`,
`WALKING`. Language tags are normalized to supported base codes. Routes/matches use encoded polyline precision 6.

Successful JSON responses include `requestId`, `datasetVersion`, and `attribution`; responses also carry
`X-Request-Id` and `X-Maps-Dataset-Version`. Preserve the request ID when reporting problems.

## Endpoint summary

| Method and path | Required scope | Default limit/min |
|---|---|---:|
| `GET /health/live` | public | — |
| `GET /v1/catalog` | any valid key | — |
| `GET /v1/styles/*`, `/tiles/*`, `/fonts/*`, `/sprites/*` | `assets:read` | 1,200/token/IP |
| `GET /v1/geocode/search`, `/reverse` | `geocode:read` | 120 |
| `POST /v1/routes` | `route:read` | 60 |
| `POST /v1/matches` | `match:read` | 10 |
| `POST /v1/matrices` | `matrix:read` | 10 |
| `GET /v1/usage` | `usage:read` | 60 |

Project configuration may lower or raise these limits. Match and matrix concurrency defaults to two per project.

## Catalog and presentation assets

`GET /v1/catalog` reports active dataset, bounds, countries, languages, profiles, style URLs, and TileJSON URL.

```bash
curl -H "X-Quantix-Maps-Key: $MAPS_PUBLISHABLE_KEY" \
  https://maps.quantixlab.dev/v1/catalog
```

MapLibre should load `/v1/styles/light.json` or `/v1/styles/dark.json` with the publishable-key header. Styles refer
to authenticated TileJSON, vector tile, glyph, and sprite URLs. Do not call Martin directly.

## Forward and reverse geocoding

Search parameters: `q` (2–120 characters), optional `countryCode`, paired `latitude`/`longitude` proximity,
`language`, and `limit` (1–10, default 6). Reverse requires coordinates and accepts `radiusMeters` (0–50,000,
default 1,000), `language`, and `limit` (1–5). Empty `items` is a successful result.

```bash
curl --get -H "Authorization: Bearer $MAPS_SERVER_KEY" \
  --data-urlencode 'q=Dhaka' --data-urlencode 'countryCode=BD' \
  https://maps.quantixlab.dev/v1/geocode/search

curl --get -H "Authorization: Bearer $MAPS_SERVER_KEY" \
  --data-urlencode 'latitude=23.8103' --data-urlencode 'longitude=90.4125' \
  https://maps.quantixlab.dev/v1/geocode/reverse
```

## Routes

`POST /v1/routes` accepts 2–25 points, a profile, and optional language. The response contains totals and legs with
`encodedPolyline6` and maneuvers.

```bash
curl -H "Authorization: Bearer $MAPS_SERVER_KEY" -H 'Content-Type: application/json' \
  -d '{"profile":"DRIVING","points":[{"latitude":23.8103,"longitude":90.4125},{"latitude":23.75,"longitude":90.39}]}' \
  https://maps.quantixlab.dev/v1/routes
```

## Trace matching

`POST /v1/matches` accepts 2–2,000 points. Each may include a nonnegative integer `timestampSeconds`. The result has
the matched polyline, distance, duration, and optional confidence.

```json
{"profile":"DRIVING","points":[
  {"latitude":23.8103,"longitude":90.4125,"timestampSeconds":0},
  {"latitude":23.7900,"longitude":90.4050,"timestampSeconds":60}
]}
```

## Matrices

`POST /v1/matrices` accepts 1–25 sources and 1–25 targets, with at most 625 pairs. Output rows follow source order;
columns follow target order. Unreachable distance/duration cells are `null`.

```json
{"profile":"DRIVING","sources":[{"latitude":23.8103,"longitude":90.4125}],
 "targets":[{"latitude":23.7500,"longitude":90.3900}]}
```

## Errors and retries

Errors use RFC 9457 `application/problem+json` with `type`, `title`, `status`, `requestId`, and optional `detail`.
Handle 400, 401, 403, 404, 413, 415, 422, 429, 502, 503, and 504. `429` includes `Retry-After` and RateLimit headers.
Retry 429, 502, 503, and 504 with bounded exponential backoff plus jitter, respecting `Retry-After`; do not blindly
retry validation or authentication failures. Set client timeouts appropriate to the operation and cancel abandoned
requests.

## Versioning and attribution

`/v1` is the compatibility boundary. Additive response fields may appear; clients should ignore unknown fields.
Breaking changes require a new major path. Store `datasetVersion` with routes or derived artifacts when reproducible
results matter. Display `© OpenStreetMap contributors` wherever map data is presented.

## Operator-only endpoints

`GET /internal/health/ready` and `/internal/metrics` require the operator Bearer token and bind to loopback port 8080.
They are not consumer APIs and must not be exposed through Caddy or Cloudflare.
