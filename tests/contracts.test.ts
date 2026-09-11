import { describe, expect, it } from 'vitest';
import { ReverseQuerySchema, SearchQuerySchema } from '../src/contracts/geocode.js';
import { MatchRequestSchema, MatrixRequestSchema, RouteRequestSchema } from '../src/contracts/navigation.js';

const dhaka = { latitude: 23.81, longitude: 90.41 };
describe('v1 request contracts', () => {
  it('normalizes BCP 47 languages and defaults search limit', () => {
    expect(SearchQuerySchema.parse({ q: 'Dhaka', language: 'bn-BD' })).toMatchObject({ language: 'bn', limit: 6 });
  });
  it('rejects unpaired and out-of-region proximity', () => {
    expect(SearchQuerySchema.safeParse({ q: 'Dhaka', latitude: 23 }).success).toBe(false);
    expect(SearchQuerySchema.safeParse({ q: 'Tokyo', latitude: 45, longitude: 150 }).success).toBe(false);
    expect(SearchQuerySchema.safeParse({ q: 'Equator', latitude: 0, longitude: 200 }).success).toBe(false);
  });
  it('accepts valid reverse coordinates without leaking other query fields into strict validation', () => {
    expect(ReverseQuerySchema.parse(dhaka)).toMatchObject({ ...dhaka, radiusMeters: 1_000, limit: 1 });
  });
  it('enforces route, match, and matrix ceilings', () => {
    expect(RouteRequestSchema.safeParse({ profile: 'AUTO', points: [dhaka, dhaka] }).success).toBe(false);
    expect(MatchRequestSchema.safeParse({ profile: 'WALKING', points: [dhaka] }).success).toBe(false);
    expect(MatrixRequestSchema.safeParse({ profile: 'DRIVING', sources: Array(25).fill(dhaka), targets: Array(25).fill(dhaka) }).success).toBe(true);
    expect(MatrixRequestSchema.safeParse({ profile: 'DRIVING', sources: Array(25).fill(dhaka), targets: Array(26).fill(dhaka) }).success).toBe(false);
  });
  it('accepts directional route hints and bounded match uncertainty', () => {
    expect(RouteRequestSchema.parse({ profile: 'DRIVING', points: [
      { ...dhaka, headingDegrees: 270, headingToleranceDegrees: 60, radiusMeters: 25 }, dhaka,
    ] }).points[0]).toMatchObject({ headingDegrees: 270, headingToleranceDegrees: 60, radiusMeters: 25 });
    expect(MatchRequestSchema.safeParse({ profile: 'DRIVING', points: [dhaka, dhaka],
      gpsAccuracyM: 8, searchRadiusM: 30 }).success).toBe(true);
    expect(MatchRequestSchema.safeParse({ profile: 'DRIVING', points: [dhaka, dhaka],
      searchRadiusM: 101 }).success).toBe(false);
  });
});
