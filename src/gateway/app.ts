import express, { type NextFunction, type Request, type Response } from 'express';
import swaggerUi from 'swagger-ui-express';
import type { RedisLike } from '../rate-limits/redis.js';
import { ATTRIBUTION, BOUNDS, COUNTRIES, LANGUAGES, PROFILES } from '../contracts/constants.js';
import { GeocodeResponseSchema, SearchQuerySchema, ReverseQuerySchema } from '../contracts/geocode.js';
import { MatchRequestSchema, MatchResponseSchema, MatrixRequestSchema, MatrixResponseSchema, RouteRequestSchema, RouteResponseSchema } from '../contracts/navigation.js';
import { authorize } from '../auth/middleware.js';
import type { ProjectStore } from '../auth/project-store.js';
import type { Config } from '../config.js';
import type { PhotonProvider } from '../providers/photon.js';
import type { ValhallaProvider } from '../providers/valhalla.js';
import { concurrencyLimit } from '../rate-limits/concurrency.js';
import { rateLimit } from '../rate-limits/middleware.js';
import type { RateStore } from '../rate-limits/store.js';
import { providerReady, registry } from '../observability/metrics.js';
import { observe } from '../observability/middleware.js';
import { proxyMartin, sendAsset } from './assets.js';
import { problem, UpstreamError } from './problem.js';
import { bodyLimit, validate } from './validate.js';
import { requestContext } from './request.js';
import type { ResponseCache } from './cache.js';

export type AppDependencies = { config: Config; version: string; projects: ProjectStore; rates: RateStore;
  redis: RedisLike; cache: ResponseCache; photon: PhotonProvider; valhalla: ValhallaProvider; openapi: object };
const meta = (req: Request) => ({ requestId: req.requestId, datasetVersion: req.datasetVersion, attribution: ATTRIBUTION });

export const createApp = (d: AppDependencies) => {
  const app = express(); app.disable('x-powered-by'); app.set('trust proxy', 1);
  app.use(requestContext(d.version), observe, (req, res, next) => {
    res.set({ 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Quantix-Maps-Key, X-Request-Id' });
    if (req.method === 'OPTIONS') { res.sendStatus(204); return; } next();
  });
  app.get('/health/live', (_req, res) => res.json({ status: 'ok' }));
  app.get('/openapi.json', (_req, res) => res.json(d.openapi));
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(d.openapi, { customSiteTitle: 'Quantix Lab Maps API' }));
  const pub = authorize(d.projects, 'publishable', 'assets:read'); const assetLimit = rateLimit(d.rates, 'assets');
  app.get('/v1/catalog', authorizeAny(d.projects), async (req, res) => res.json({ ...meta(req), bounds: BOUNDS,
    countries: COUNTRIES, languages: LANGUAGES, profiles: PROFILES, styles: {
      light: `${d.config.PUBLIC_BASE_URL}/v1/styles/light.json`, dark: `${d.config.PUBLIC_BASE_URL}/v1/styles/dark.json`,
    }, tileJson: `${d.config.PUBLIC_BASE_URL}/v1/tiles/region.json` }));
  app.get('/v1/styles/:file', pub, assetLimit, sendAsset(d.config.DATASET_ROOT, 'styles'));
  app.get('/v1/fonts/*path', pub, assetLimit, sendAsset(d.config.DATASET_ROOT, 'fonts'));
  app.get('/v1/sprites/*path', pub, assetLimit, sendAsset(d.config.DATASET_ROOT, 'sprites'));
  app.get('/v1/tiles/*path', pub, assetLimit, proxyMartin(d.config.MARTIN_URL, d.config.PUBLIC_BASE_URL));
  app.use(bodyLimit, (req, res, next) => {
    if (['POST', 'PUT', 'PATCH'].includes(req.method) && !req.is('application/json')) return problem(res, req, 415, 'media-type', 'Content-Type must be application/json');
    next();
  }, express.json({ limit: '1mb', strict: true }));
  app.get('/v1/geocode/search', authorize(d.projects, 'secret', 'geocode:read'), rateLimit(d.rates, 'geocode'),
    validate(SearchQuerySchema, 'query'), async (req, res) => {
      const query = req.query as any; res.set('Content-Language', query.language ?? 'en');
      const items = await d.cache.getOrSet('geocode', query, req.datasetVersion, 300, () => d.photon.search(query)); req.upstreamOutcome = 'photon:success-or-cache'; res.json(GeocodeResponseSchema.parse({ ...meta(req), items }));
    });
  app.get('/v1/geocode/reverse', authorize(d.projects, 'secret', 'geocode:read'), rateLimit(d.rates, 'geocode'),
    validate(ReverseQuerySchema, 'query'), async (req, res) => {
      const query = req.query as any; res.set('Content-Language', query.language ?? 'en');
      const items = await d.cache.getOrSet('geocode', query, req.datasetVersion, 300, () => d.photon.reverse(query)); req.upstreamOutcome = 'photon:success-or-cache'; res.json(GeocodeResponseSchema.parse({ ...meta(req), items }));
    });
  app.post('/v1/routes', authorize(d.projects, 'secret', 'route:read'), rateLimit(d.rates, 'route'), validate(RouteRequestSchema),
    async (req, res) => { const value = await d.cache.getOrSet('route', req.body, req.datasetVersion, 60, () => d.valhalla.route(req.body)); req.upstreamOutcome = 'valhalla:success-or-cache'; res.json(RouteResponseSchema.parse({ ...meta(req), ...value })); });
  app.post('/v1/matches', authorize(d.projects, 'secret', 'match:read'), rateLimit(d.rates, 'match'), concurrencyLimit(d.redis, 'match'),
    validate(MatchRequestSchema), async (req, res) => { const value = await d.valhalla.match(req.body); req.upstreamOutcome = 'valhalla:success'; res.json(MatchResponseSchema.parse({ ...meta(req), ...value })); });
  app.post('/v1/matrices', authorize(d.projects, 'secret', 'matrix:read'), rateLimit(d.rates, 'matrix'), concurrencyLimit(d.redis, 'matrix'),
    validate(MatrixRequestSchema), async (req, res) => { const value = await d.valhalla.matrix(req.body); req.upstreamOutcome = 'valhalla:success'; res.json(MatrixResponseSchema.parse({ ...meta(req), ...value })); });
  app.get('/v1/usage', authorize(d.projects, 'secret', 'usage:read'), rateLimit(d.rates, 'usage'), async (req, res) =>
    res.json({ ...meta(req), days: await d.rates.usage(req.principal!.project.id) }));
  app.get('/internal/health/ready', operator(d.config.OPERATOR_TOKEN), async (_req, res) => {
    const healthy = (url: URL) => fetch(url, { signal: AbortSignal.timeout(3_000) }).then((response) => { if (!response.ok) throw new Error(String(response.status)); });
    const checks = await Promise.allSettled([healthy(new URL('/status', d.config.PHOTON_URL)), healthy(new URL('/status', d.config.VALHALLA_URL)),
      healthy(new URL('/catalog', d.config.MARTIN_URL)), d.redis.ping()]);
    ['photon', 'valhalla', 'martin', 'valkey'].forEach((provider, index) => providerReady.set({ provider }, checks[index]?.status === 'fulfilled' ? 1 : 0));
    const ready = d.version !== 'unavailable' && checks.every((v) => v.status === 'fulfilled'); res.status(ready ? 200 : 503).json({ ready, datasetVersion: d.version });
  });
  app.get('/internal/metrics', operator(d.config.OPERATOR_TOKEN), async (_req, res) => res.type(registry.contentType).send(await registry.metrics()));
  app.use((req, res) => problem(res, req, 404, 'not-found', 'Resource not found'));
  app.use((error: unknown, req: Request, res: Response, _next: NextFunction) => {
    void _next;
    const status = typeof error === 'object' && error && 'status' in error ? Number(error.status) : undefined;
    if (status === 413) return problem(res, req, 413, 'payload-too-large', 'Request payload too large');
    if (error instanceof SyntaxError) return problem(res, req, 400, 'invalid-json', 'Malformed JSON');
    if (error instanceof UpstreamError) { req.upstreamOutcome = `${error.provider}:failure`; return problem(res, req, error.status, 'upstream', 'Map provider request failed'); }
    problem(res, req, 503, 'unavailable', 'Service temporarily unavailable');
  }); return app;
};

const operator = (token: string) => (req: Request, res: Response, next: NextFunction) => {
  if (req.header('Authorization') !== `Bearer ${token}`) return problem(res, req, 401, 'operator-auth', 'Operator authentication required'); next();
};
const authorizeAny = (store: ProjectStore) => async (req: Request, res: Response, next: NextFunction) => {
  const token = req.header('X-Quantix-Maps-Key') ?? req.header('Authorization')?.replace(/^Bearer\s+/i, '');
  try { const principal = token ? await store.authenticate(token) : undefined; if (!principal) return problem(res, req, 401, 'authentication', 'Authentication required'); req.principal = principal; next(); }
  catch (error) { next(error); }
};
