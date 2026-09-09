import { createClient } from 'redis';
import { loadConfig } from './config.js';
import { ProjectStore } from './auth/project-store.js';
import { createOpenApiDocument } from './contracts/openapi.js';
import { createApp } from './gateway/app.js';
import { datasetCreatedAt, datasetVersion } from './gateway/request.js';
import { ResponseCache } from './gateway/cache.js';
import { PhotonProvider } from './providers/photon.js';
import { ValhallaProvider } from './providers/valhalla.js';
import { RateStore } from './rate-limits/store.js';
import { datasetAge, datasetInfo } from './observability/metrics.js';

const config = loadConfig();
const redis = createClient({ url: config.REDIS_URL });
redis.on('error', (error) => process.stderr.write(`Valkey connection error: ${error.message}\n`));
await redis.connect();
const projects = new ProjectStore(config.PROJECTS_FILE, config.MAP_KEY_HASH_SECRET);
await projects.reload(true);
const version = await datasetVersion(config.DATASET_ROOT);
const createdAt = await datasetCreatedAt(config.DATASET_ROOT); datasetInfo.set({ release: version }, 1);
if (createdAt) {
  const updateAge = () => datasetAge.set((Date.now() - createdAt) / 1_000); updateAge(); setInterval(updateAge, 60_000).unref();
}
const app = createApp({ config, version, projects, redis, rates: new RateStore(redis), cache: new ResponseCache(redis),
  photon: new PhotonProvider(config.PHOTON_URL), valhalla: new ValhallaProvider(config.VALHALLA_URL), openapi: createOpenApiDocument() });
const server = app.listen(config.PORT, () => process.stdout.write(`Quantix Lab Maps listening on :${config.PORT}\n`));
const shutdown = () => server.close(() => void redis.quit().finally(() => process.exit(0)));
process.on('SIGTERM', shutdown); process.on('SIGINT', shutdown);
