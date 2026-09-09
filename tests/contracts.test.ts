import { describe, expect, it } from 'vitest';
import { SearchQuerySchema } from '../src/contracts/geocode.js';
import { MatchRequestSchema, MatrixRequestSchema, RouteRequestSchema } from '../src/contracts/navigation.js';

const dhaka = { latitude: 23.81, longitude: 90.41 };
describe('v1 request contracts', () => {
  it('normalizes BCP 47 languages and defaults search limit', () => {
    expect(SearchQuerySchema.parse({ q: 'Dhaka', language: 'bn-BD' })).toMatchObject({ language: 'bn', limit: 6 });
  });
  it('rejects unpaired and out-of-region proximity', () => {
    expect(SearchQuerySchema.safeParse({ q: 'Dhaka', latitude: 23 }).success).toBe(false);
    expect(SearchQuerySchema.safeParse({ q: 'Tokyo', latitude: 45, longitude: 150 }).success).toBe(false);
  });
  it('enforces route, match, and matrix ceilings', () => {
    expect(RouteRequestSchema.safeParse({ profile: 'AUTO', points: [dhaka, dhaka] }).success).toBe(false);
    expect(MatchRequestSchema.safeParse({ profile: 'WALKING', points: [dhaka] }).success).toBe(false);
    expect(MatrixRequestSchema.safeParse({ profile: 'DRIVING', sources: Array(25).fill(dhaka), targets: Array(25).fill(dhaka) }).success).toBe(true);
    expect(MatrixRequestSchema.safeParse({ profile: 'DRIVING', sources: Array(25).fill(dhaka), targets: Array(26).fill(dhaka) }).success).toBe(false);
  });
});
