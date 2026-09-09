import { describe, expect, it, vi } from 'vitest';
import { ResponseCache } from '../src/gateway/cache.js';
import { RateStore } from '../src/rate-limits/store.js';

describe('Valkey-backed controls', () => {
  it('uses opaque dataset-specific cache keys and reuses cached values', async () => {
    const values = new Map<string, string>();
    const redis = { get: async (key: string) => values.get(key) ?? null, setEx: async (key: string, _seconds: number, value: string) => { values.set(key, value); } } as any;
    const cache = new ResponseCache(redis); const producer = vi.fn().mockResolvedValue({ result: 1 });
    expect(await cache.getOrSet('geocode', { q: 'private search' }, '2026-09-09.1', 60, producer)).toEqual({ result: 1 });
    expect(await cache.getOrSet('geocode', { q: 'private search' }, '2026-09-09.1', 60, producer)).toEqual({ result: 1 });
    expect(producer).toHaveBeenCalledOnce(); expect([...values.keys()][0]).not.toContain('private search');
  });
  it('returns token-bucket state and stores bounded daily usage', async () => {
    const redis = { eval: vi.fn().mockResolvedValue([1, 9, 0]), hIncrBy: vi.fn(), expire: vi.fn(), hGetAll: vi.fn().mockResolvedValue({ route: '3' }) } as any;
    const rates = new RateStore(redis); expect(await rates.take('tourbond', 'route', 10)).toEqual({ allowed: true, remaining: 9, retryMs: 0 });
    await rates.incrementUsage('tourbond', 'route'); expect(redis.expire).toHaveBeenCalledWith(expect.stringMatching(/^usage:tourbond:/), 35 * 86_400);
  });
});
