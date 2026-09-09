# Technical research record

The v1 design was checked against primary project documentation in September 2026:

- [Martin](https://maplibre.org/martin/) supports PMTiles, TileJSON, and tile endpoints. Its container-local TileJSON
  URLs are rewritten by the gateway before they reach consumers.
- [Photon API](https://github.com/komoot/photon/blob/master/docs/api-v1.md) defines forward/reverse search,
  `countrycode`, language, and kilometer-based reverse radius. The gateway exposes meters and converts them.
- [Photon operations](https://github.com/komoot/photon/blob/master/docs/usage.md) supports country-filtered imports;
  releases build a new index rather than update one in place.
- [Valhalla APIs](https://valhalla.github.io/valhalla/api/) provide routes, trace matching, and source-target matrices.
  The gateway maintains smaller stable limits and [polyline6](https://valhalla.github.io/valhalla/api/decoding/).
- [PMTiles CLI](https://docs.protomaps.com/pmtiles/cli) supplies `show` and `verify`; both run before activation.
- [MapLibre glyphs](https://maplibre.org/maplibre-style-spec/glyphs/) require an absolute 256-codepoint PBF template.
  [MapLibre font-maker](https://github.com/maplibre/font-maker) documents current complex-text-layout limitations,
  so Bengali, Devanagari, Myanmar, Tamil, and related scripts require device-level shaping acceptance.
- [OpenStreetMap licensing](https://www.openstreetmap.org/copyright) requires attribution and ODbL disclosure.
- [Valkey security](https://valkey.io/topics/security/) supports the private-network, ACL, and no-published-port model.
- [RFC 9457](https://www.rfc-editor.org/rfc/rfc9457.html) defines the problem response format.
- [OWASP API4](https://owasp.org/API-Security/editions/2023/en/0xa4-unrestricted-resource-consumption/) supports
  pre-computation request, concurrency, timeout, and rate controls.
- [Prometheus guidance](https://prometheus.io/docs/practices/instrumentation/) supports bounded labels.
- [GitHub attestations](https://docs.github.com/en/actions/how-tos/secure-your-work/use-artifact-attestations/use-artifact-attestations)
  provide build provenance for published images.

Geofabrik's [Asia catalog](https://download.geofabrik.de/asia.html) confirms the Indonesia extract includes
Timor-Leste; an independent East Timor extract therefore must not be merged on top of it.
