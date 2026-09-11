import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('production Valkey ACL', () => {
  it('grants every command used by gateway data structures and Lua scripts', () => {
    const acl = readFileSync('deploy/maps/users.acl.example', 'utf8');
    const gateway = acl.split('\n').find((line) => line.startsWith('user maps-gateway '));
    expect(gateway).toBeDefined();

    for (const command of [
      'ping', 'eval', 'hget', 'hmget', 'hset', 'hgetall', 'hincrby', 'expire',
      'pexpire', 'incr', 'decr', 'get', 'setex',
    ]) {
      expect(gateway, `missing Valkey command ${command}`).toContain(`+${command}`);
    }
    for (const keyPattern of ['rate:*', 'usage:*', 'concurrency:*', 'cache:*']) {
      expect(gateway, `missing Valkey key pattern ${keyPattern}`).toContain(`~${keyPattern}`);
    }
  });
});
