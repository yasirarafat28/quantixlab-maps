import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp, type AppDependencies } from '../src/gateway/app.js';

const scopes = ['assets:read', 'geocode:read', 'route:read', 'match:read', 'matrix:read', 'usage:read'];
const project = { id: 'tourbond', name: 'TourBond', enabled: true, quotas: {}, keys: [] };
const redis = {
  eval: async (script: string) => script.includes("redis.call('INCR'") ? 1 : [1, 99, 0], hIncrBy: async () => 1,
  expire: async () => 1, hGetAll: async () => ({}), decr: async () => 0, ping: async () => 'PONG', get: async () => null, setEx: async () => 'OK',
};
const dependencies = {
  config: { NODE_ENV: 'test', PORT: 8080, PUBLIC_BASE_URL: 'https://maps.quantixlab.dev', DATASET_ROOT: '/missing',
    PROJECTS_FILE: '/missing', MAP_KEY_HASH_SECRET: 'x'.repeat(32), REDIS_URL: 'redis://localhost:6379', PHOTON_URL: 'http://photon:2322',
    VALHALLA_URL: 'http://valhalla:8002', MARTIN_URL: 'http://martin:3000', OPERATOR_TOKEN: 'o'.repeat(32) },
  version: '2026-09-09.1', redis,
  projects: { authenticate: async (token: string) => ({ project, key: { id: 'key-id', type: token.startsWith('qlm_pk') ? 'publishable' : 'secret',
    hash: 'a'.repeat(64), scopes, createdAt: new Date().toISOString() } }) },
  rates: { take: async () => ({ allowed: true, remaining: 99, retryMs: 0 }), incrementUsage: async () => undefined, usage: async () => ({}) },
  cache: { getOrSet: async (_operation: string, _input: unknown, _dataset: string, _ttl: number, produce: () => Promise<unknown>) => produce() },
  photon: { search: async () => [], reverse: async () => [] },
  valhalla: { route: async () => ({ distanceMeters: 1, durationSeconds: 1, legs: [{ encodedPolyline6: 'x', distanceMeters: 1, durationSeconds: 1, maneuvers: [] }] }),
    match: async () => ({ encodedPolyline6: 'x', distanceMeters: 1, durationSeconds: 1 }),
    matrix: async () => ({ distancesMeters: [[1]], durationsSeconds: [[2]] }) }, openapi: { openapi: '3.1.0' },
} as unknown as AppDependencies;
const app = createApp(dependencies);

describe('gateway HTTP contract', () => {
  it('serves liveness and request metadata without credentials', async () => {
    const response = await request(app).get('/health/live'); expect(response.status).toBe(200);
    expect(response.headers).toHaveProperty('x-request-id'); expect(response.headers['x-maps-dataset-version']).toBe('2026-09-09.1');
  });
  it('requires secret authentication for compute', async () => {
    const response = await request(app).post('/v1/routes').send({}); expect(response.status).toBe(401);
    expect(response.type).toBe('application/problem+json');
  });
  it('uses parsed Express 5 query data without assigning to read-only req.query', async () => {
    const response = await request(app).get('/v1/geocode/search').set('Authorization', 'Bearer qlm_sk_test')
      .query({ q: 'Dhaka', countryCode: 'BD', limit: '1' });
    expect(response.status).toBe(200); expect(response.body).toMatchObject({ items: [], datasetVersion: '2026-09-09.1' });
    expect(response.headers['content-language']).toBe('en');
  });
  it('rejects unknown fields and invalid profiles', async () => {
    const response = await request(app).post('/v1/routes').set('Authorization', 'Bearer qlm_sk_test').send({
      profile: 'AUTO', points: [{ latitude: 23.8, longitude: 90.4 }, { latitude: 23.7, longitude: 90.3 }], raw: true,
    }); expect(response.status).toBe(422); expect(response.body.type).toContain('/validation');
  });
  it('returns normalized matrices in input order', async () => {
    const response = await request(app).post('/v1/matrices').set('Authorization', 'Bearer qlm_sk_test').send({
      profile: 'DRIVING', sources: [{ latitude: 23.8, longitude: 90.4 }], targets: [{ latitude: 23.7, longitude: 90.3 }],
    }); expect(response.status).toBe(200); expect(response.body).toMatchObject({ distancesMeters: [[1]], durationsSeconds: [[2]], datasetVersion: '2026-09-09.1' });
  });
  it('requires JSON media type', async () => {
    const response = await request(app).post('/v1/routes').set('Authorization', 'Bearer qlm_sk_test').set('Content-Type', 'text/plain').send('x');
    expect(response.status).toBe(415);
  });
});
