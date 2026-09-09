import { createHash } from 'node:crypto';
import type { RedisLike } from '../rate-limits/redis.js';

export class ResponseCache {
  constructor(private readonly redis: RedisLike) {}
  async getOrSet<T>(operation: 'geocode' | 'route', input: unknown, dataset: string, ttlSeconds: number, produce: () => Promise<T>): Promise<T> {
    const digest = createHash('sha256').update(JSON.stringify({ dataset, input })).digest('hex');
    const key = `cache:${operation}:${digest}`; const cached = await this.redis.get(key);
    if (cached) return JSON.parse(cached) as T;
    const value = await produce(); await this.redis.setEx(key, ttlSeconds, JSON.stringify(value)); return value;
  }
}
