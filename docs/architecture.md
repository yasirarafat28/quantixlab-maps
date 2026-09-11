# Architecture

Quantix Lab Maps is one independently deployed platform. Caddy terminates TLS for `maps.quantixlab.dev` and the
temporary `tourbond-maps.quantixlab.dev` alias. All public traffic enters the gateway; providers have no published
ports. Compute endpoints normalize Photon and Valhalla so consumers never depend on upstream response formats.

```text
client -> Caddy -> gateway -> Martin -> immutable PMTiles
                         \-> Photon -> immutable search index
                         \-> Valhalla -> immutable routing graph
                         \-> Valkey -> limits and 35-day usage totals
```

The gateway is attached to `quantixlab-maps-consumers`, allowing a same-host backend to use
`http://gateway:8080`. Dedicated-host consumers use HTTPS. Mobile and browser clients always use the canonical
HTTPS domain. `/internal/*` is blocked by Caddy and exposed only through gateway's `127.0.0.1:8080` binding.

Data is a separately versioned release. `/srv/quantixlab-maps/current` is an atomic symlink to one immutable
release. Containers consume the same layout in either deployment mode. The repository contains no PBF, PMTiles,
Photon index, Valhalla graph, or generated font archive.

Availability boundaries are deliberate: metrics are optional, but Valkey, Photon, Valhalla, Martin, and an active
dataset must all be healthy before readiness succeeds. Caddy remains the only internet-facing container.
