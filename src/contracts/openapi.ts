import { OpenAPIRegistry, OpenApiGeneratorV31 } from '@asteasolutions/zod-to-openapi';
import { z } from './zod.js';
import { ProblemSchema } from './common.js';
import { GeocodeResponseSchema, ReverseQuerySchema, SearchQuerySchema } from './geocode.js';
import { MatchRequestSchema, MatchResponseSchema, MatrixRequestSchema, MatrixResponseSchema, RouteRequestSchema, RouteResponseSchema } from './navigation.js';

const json = (schema: z.ZodType) => ({ description: 'Successful response', content: { 'application/json': { schema } } });
const problems = { description: 'Problem details', content: { 'application/problem+json': { schema: ProblemSchema } } };
const errors = { 400: problems, 401: problems, 403: problems, 413: problems, 415: problems, 422: problems, 429: problems, 502: problems, 503: problems, 504: problems };
const common = z.object({ requestId: z.string(), datasetVersion: z.string(), attribution: z.string() }).passthrough();

export const createOpenApiDocument = () => {
  const r = new OpenAPIRegistry();
  r.registerComponent('securitySchemes', 'PublishableKey', { type: 'apiKey', in: 'header', name: 'X-Quantix-Maps-Key' });
  r.registerComponent('securitySchemes', 'ServerKey', { type: 'http', scheme: 'bearer', bearerFormat: 'qlm_sk' });
  r.registerComponent('securitySchemes', 'OperatorToken', { type: 'http', scheme: 'bearer' });
  r.register('Problem', ProblemSchema); r.register('RouteRequest', RouteRequestSchema); r.register('RouteResponse', RouteResponseSchema);
  r.register('MatchRequest', MatchRequestSchema); r.register('MatchResponse', MatchResponseSchema);
  r.register('MatrixRequest', MatrixRequestSchema); r.register('MatrixResponse', MatrixResponseSchema); r.register('GeocodeResponse', GeocodeResponseSchema);
  r.registerPath({ method: 'get', path: '/health/live', tags: ['Health'], summary: 'Process liveness', responses: { 200: json(z.object({ status: z.literal('ok') })) } });
  r.registerPath({ method: 'get', path: '/v1/catalog', tags: ['Assets'], summary: 'Active dataset and capabilities', security: [{ PublishableKey: [] }, { ServerKey: [] }], responses: { 200: json(common), ...errors } });
  for (const [path, summary] of [
    ['/v1/styles/{theme}.json', 'MapLibre style'], ['/v1/tiles/{source}.json', 'TileJSON'],
    ['/v1/tiles/{source}/{z}/{x}/{y}.pbf', 'Vector tile'], ['/v1/fonts/{fontstack}/{range}.pbf', 'Glyph range'],
    ['/v1/sprites/{name}.json', 'Sprite index'], ['/v1/sprites/{name}.png', 'Sprite image'],
  ] as const) r.registerPath({ method: 'get', path, tags: ['Assets'], summary, security: [{ PublishableKey: [] }],
    request: { params: z.object(Object.fromEntries([...path.matchAll(/{([^}]+)}/g)].map((m) => [m[1]!, z.string()])) as Record<string, z.ZodString>) },
    responses: { 200: { description: summary }, ...errors } });
  r.registerPath({ method: 'get', path: '/v1/geocode/search', tags: ['Geocoding'], summary: 'Forward geocoding', security: [{ ServerKey: [] }],
    request: { query: SearchQuerySchema }, responses: { 200: json(GeocodeResponseSchema), ...errors } });
  r.registerPath({ method: 'get', path: '/v1/geocode/reverse', tags: ['Geocoding'], summary: 'Reverse geocoding', security: [{ ServerKey: [] }],
    request: { query: ReverseQuerySchema }, responses: { 200: json(GeocodeResponseSchema), ...errors } });
  const posts = [
    ['/v1/routes', 'Generate a route', RouteRequestSchema, RouteResponseSchema],
    ['/v1/matches', 'Match a GPS trace', MatchRequestSchema, MatchResponseSchema],
    ['/v1/matrices', 'Generate a time-distance matrix', MatrixRequestSchema, MatrixResponseSchema],
  ] as const;
  for (const [path, summary, body, response] of posts) r.registerPath({ method: 'post', path, tags: ['Navigation'], summary,
    security: [{ ServerKey: [] }], request: { body: { content: { 'application/json': { schema: body } } } }, responses: { 200: json(response), ...errors } });
  r.registerPath({ method: 'get', path: '/v1/usage', tags: ['Usage'], summary: 'Recent project usage', security: [{ ServerKey: [] }], responses: { 200: json(common), ...errors } });
  r.registerPath({ method: 'get', path: '/internal/health/ready', tags: ['Operator'], summary: 'Dependency readiness', security: [{ OperatorToken: [] }], responses: { 200: json(z.object({ ready: z.boolean(), datasetVersion: z.string() })), 503: problems } });
  r.registerPath({ method: 'get', path: '/internal/metrics', tags: ['Operator'], summary: 'Prometheus metrics', security: [{ OperatorToken: [] }], responses: { 200: { description: 'Prometheus text format' } } });
  return new OpenApiGeneratorV31(r.definitions).generateDocument({ openapi: '3.1.0', info: { title: 'Quantix Lab Maps API', version: '1.0.0',
    description: 'Normalized regional mapping API. Data © OpenStreetMap contributors, ODbL 1.0.' }, servers: [{ url: 'https://maps.quantixlab.dev' }] });
};
