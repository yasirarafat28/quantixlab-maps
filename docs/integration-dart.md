# Dart and Flutter integration

Depend on a signed Git tag until the package is published:

```yaml
quantixlab_maps:
  git:
    url: https://github.com/yasirarafat28/quantixlab-maps.git
    ref: v1.0.0
    path: packages/dart-client
```

Backend calls use `QuantixMapsClient(serverKey: ...)`. Never embed that server key in Flutter. For MapLibre, load
`https://maps.quantixlab.dev/v1/styles/light.json` and configure custom headers with
`client.assetHeaders(publishableKey)`. Apply the header only to the exact canonical hostname so it cannot leak to
third-party resources. Keep `© OpenStreetMap contributors` visible in the map UI and disclose ODbL data use.

The publishable token can be shipped in the app but remains revocable and rate-limited. Rotate it when an app build
is retired or abusive traffic is identified.
