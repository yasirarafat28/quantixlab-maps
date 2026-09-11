import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('production container health checks', () => {
  it('probes the confirmed IPv4 Caddy admin listener', () => {
    const compose = readFileSync('deploy/compose.yaml', 'utf8');
    expect(compose).toContain('http://127.0.0.1:2019/config/');
    expect(compose).not.toContain('http://localhost:2019/config/');
  });

  it('keeps acceptance trace samples within Valhalla breakage distance', () => {
    const script = readFileSync('deploy/release/accept-release.sh', 'utf8');
    const serialized = script.match(/^match='(.+)'$/m)?.[1];
    expect(serialized).toBeDefined();
    const points = JSON.parse(serialized!).points as Array<{ latitude: number; longitude: number }>;
    const radians = (degrees: number) => degrees * Math.PI / 180;
    for (let index = 1; index < points.length; index += 1) {
      const previous = points[index - 1]!; const current = points[index]!;
      const latitude = radians(current.latitude - previous.latitude);
      const longitude = radians(current.longitude - previous.longitude);
      const value = Math.sin(latitude / 2) ** 2 + Math.cos(radians(previous.latitude))
        * Math.cos(radians(current.latitude)) * Math.sin(longitude / 2) ** 2;
      expect(6_371_000 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value))).toBeLessThan(2_000);
    }
  });
});
