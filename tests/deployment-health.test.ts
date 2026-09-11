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

  it('parenthesizes jq arithmetic in the matrix fixture', () => {
    const script = readFileSync('deploy/release/accept-release.sh', 'utf8');
    expect(script).toContain('latitude:($lat + 0.005),longitude:($lon + 0.005)');
    expect(script).not.toContain('latitude:$lat+0.005');
  });

  it('uses bounded retries for rate-limited release acceptance', () => {
    const script = readFileSync('deploy/release/accept-release.sh', 'utf8');
    expect(script).toContain('ACCEPT_REQUEST_DELAY_SECONDS:-1');
    expect(script).toContain('--retry 20 --retry-delay 6 --retry-max-time 180');
    expect(script).not.toContain('--retry-all-errors');
  });

  it('evaluates every matching predicate against the response object', () => {
    const script = readFileSync('deploy/release/accept-release.sh', 'utf8');
    expect(script).toContain("jq -e '(.encodedPolyline6 | length > 0) and (.matchedPoints | length > 0)");
    expect(script).not.toContain("jq -e '.encodedPolyline6 | length > 0 and");
  });
});
