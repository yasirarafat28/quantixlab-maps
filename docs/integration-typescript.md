# TypeScript integration

Generate the client contract with `npm run sdk:generate`, then build `packages/typescript-client`. Publish it as
`@quantixlab/maps-client` from a signed repository tag. Server applications provide a secret key through their
secret manager:

```ts
import { QuantixMapsClient } from '@quantixlab/maps-client';

const maps = new QuantixMapsClient(process.env.QUANTIX_MAPS_SERVER_KEY!);
const route = await maps.route({
  profile: 'DRIVING',
  points: [{ latitude: 23.81, longitude: 90.41 }, { latitude: 23.75, longitude: 90.39 }],
});
```

For MapLibre GL JS, use the publishable key only on requests whose URL hostname is exactly
`maps.quantixlab.dev`. Set `X-Quantix-Maps-Key` in `transformRequest`; do not append it as a query parameter. Keep
`© OpenStreetMap contributors` visible on the map.
