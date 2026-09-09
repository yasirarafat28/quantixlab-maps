import type { RedisLike } from './redis.js';

const TOKEN_BUCKET = `
local now=tonumber(ARGV[1]); local rate=tonumber(ARGV[2]); local capacity=tonumber(ARGV[3])
local values=redis.call('HMGET',KEYS[1],'tokens','updated'); local tokens=tonumber(values[1]) or capacity
local updated=tonumber(values[2]) or now; tokens=math.min(capacity,tokens+(now-updated)*rate)
local allowed=tokens>=1; if allowed then tokens=tokens-1 end
redis.call('HSET',KEYS[1],'tokens',tokens,'updated',now); redis.call('PEXPIRE',KEYS[1],math.ceil(capacity/rate))
return {allowed and 1 or 0,math.floor(tokens),math.ceil((1-tokens)/rate)}
`;

export class RateStore {
  constructor(private readonly redis: RedisLike) {}
  async take(project: string, operation: string, limitPerMinute: number): Promise<{ allowed: boolean; remaining: number; retryMs: number }> {
    const result = await this.redis.eval(TOKEN_BUCKET, {
      keys: [`rate:${project}:${operation}`], arguments: [String(Date.now()), String(limitPerMinute / 60_000), String(limitPerMinute)],
    }) as number[];
    return { allowed: result[0] === 1, remaining: result[1] ?? 0, retryMs: Math.max(0, result[2] ?? 0) };
  }
  async incrementUsage(project: string, operation: string): Promise<void> {
    const day = new Date().toISOString().slice(0, 10); const key = `usage:${project}:${day}`;
    await this.redis.hIncrBy(key, operation, 1); await this.redis.expire(key, 35 * 86_400);
  }
  async usage(project: string): Promise<Record<string, Record<string, number>>> {
    const result: Record<string, Record<string, number>> = {};
    for (let offset = 0; offset < 35; offset += 1) {
      const date = new Date(Date.now() - offset * 86_400_000).toISOString().slice(0, 10);
      const values = await this.redis.hGetAll(`usage:${project}:${date}`);
      if (Object.keys(values).length) result[date] = Object.fromEntries(Object.entries(values).map(([k, v]) => [k, Number(v)]));
    }
    return result;
  }
}
