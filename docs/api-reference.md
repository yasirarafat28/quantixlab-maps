# API reference

The canonical base is `https://maps.quantixlab.dev/v1`. Interactive documentation is served at `/docs`; the
OpenAPI 3.1 contract is `/openapi.json` and committed at `openapi/quantixlab-maps.v1.json`.

All coordinates are `{ "latitude": number, "longitude": number }`, bounded to longitude 60–142 and latitude
-12–38. Profiles are `DRIVING`, `BICYCLE`, and `WALKING`. Responses carry `requestId`, `datasetVersion`,
`attribution`, `X-Request-Id`, and `X-Maps-Dataset-Version`. Routes and matches use encoded polyline precision six.

| Method and path | Scope | Limit/minute |
|---|---|---:|
| `GET /v1/catalog` | any valid key | — |
| `GET /v1/styles/*`, `/tiles/*`, `/fonts/*`, `/sprites/*` | `assets:read` | 1,200/token/IP |
| `GET /v1/geocode/search`, `/reverse` | `geocode:read` | 120 |
| `POST /v1/routes` | `route:read` | 60 |
| `POST /v1/matches` | `match:read` | 10 |
| `POST /v1/matrices` | `matrix:read` | 10 |
| `GET /v1/usage` | `usage:read` | 60 |

Search accepts `q` (2–120), optional `countryCode`, paired proximity coordinates, `language`, and `limit` (1–10).
Reverse accepts coordinates, `radiusMeters` (0–50,000), language, and limit (1–5). Empty results are successful.

Routes accept 2–25 points. Matches accept 2–2,000 points and optional nonnegative `timestampSeconds`. Matrices accept
1–25 sources, 1–25 targets, and at most 625 pairs; output ordering equals input ordering and unreachable cells are
`null`. Match and matrix concurrency is two per project.

Errors use RFC 9457 `application/problem+json`. Clients must handle 400, 401, 403, 404, 413, 415, 422, 429, 502,
503, and 504. A 429 response includes `Retry-After`, `RateLimit-Limit`, `RateLimit-Remaining`, and `RateLimit-Reset`.
