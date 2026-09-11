import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('production container health checks', () => {
  it('probes the confirmed IPv4 Caddy admin listener', () => {
    const compose = readFileSync('deploy/compose.yaml', 'utf8');
    expect(compose).toContain('http://127.0.0.1:2019/config/');
    expect(compose).not.toContain('http://localhost:2019/config/');
  });
});
