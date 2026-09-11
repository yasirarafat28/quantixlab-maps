import { afterEach, describe, expect, it, vi } from 'vitest';
import { PhotonProvider } from '../src/providers/photon.js';
import { ValhallaProvider } from '../src/providers/valhalla.js';

afterEach(() => vi.unstubAllGlobals());
describe('provider normalization', () => {
  it('converts reverse radius meters to Photon kilometers', async () => {
    const mock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ features: [] }), { status: 200 })); vi.stubGlobal('fetch', mock);
    await new PhotonProvider('http://photon:2322').reverse({ latitude: 23.81, longitude: 90.41, radiusMeters: 1_000, limit: 1 });
    expect(String(mock.mock.calls[0]![0])).toContain('radius=1');
  });
  it('normalizes Valhalla matrix units and unreachable cells', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ sources_to_targets: [[{ distance: 1.5, time: 90 }, {}]] }), { status: 200 })));
    const result = await new ValhallaProvider('http://valhalla:8002').matrix({ profile: 'DRIVING', sources: [{ latitude: 23.8, longitude: 90.4 }],
      targets: [{ latitude: 23.7, longitude: 90.3 }, { latitude: 23.6, longitude: 90.2 }] });
    expect(result).toEqual({ distancesMeters: [[1_500, null]], durationsSeconds: [[90, null]] });
  });
  it('normalizes Valhalla route legs and meters', async () => {
    const mock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ trip: { summary: { length: 2, time: 120 },
      legs: [{ shape: 'polyline', summary: { length: 2, time: 120 }, maneuvers: [{ instruction: 'Continue', length: 0.5, time: 30, begin_shape_index: 0, end_shape_index: 2 }] }] } }), { status: 200 }));
    vi.stubGlobal('fetch', mock);
    const result = await new ValhallaProvider('http://valhalla:8002').route({ profile: 'WALKING', points: [
      { latitude: 23.8, longitude: 90.4, headingDegrees: 90, headingToleranceDegrees: 60, radiusMeters: 30 },
      { latitude: 23.7, longitude: 90.3 },
    ] });
    expect(result.distanceMeters).toBe(2_000); expect(result.legs[0]?.maneuvers[0]?.distanceMeters).toBe(500);
    expect(JSON.parse(String(mock.mock.calls[0]![1]?.body)).locations[0]).toEqual({
      lat: 23.8, lon: 90.4, heading: 90, heading_tolerance: 60, radius: 30,
    });
  });
  it('enables Valhalla timestamps for a complete monotonic GPS trace', async () => {
    const mock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ shape: 'matched',
      edges: [{ length: 1, speed: 60 }], shape_attributes: { time: [0, 20, 40] }, matched_points: [
        { lat: 23.8, lon: 90.4, type: 'matched', edge_index: 0, distance_along_edge: 0.4, distance_from_trace_point: 3 },
      ] }), { status: 200 })); vi.stubGlobal('fetch', mock);
    const result = await new ValhallaProvider('http://valhalla:8002').match({ profile: 'DRIVING', points: [
      { latitude: 23.8, longitude: 90.4, timestampSeconds: 1_789_110_000 },
      { latitude: 23.81, longitude: 90.41, timestampSeconds: 1_789_110_060 },
    ], gpsAccuracyM: 8, searchRadiusM: 30 });
    const body = JSON.parse(String(mock.mock.calls[0]![1]?.body)) as Record<string, unknown>;
    expect(String(mock.mock.calls[0]![0])).toContain('/trace_attributes');
    expect(body).toMatchObject({ begin_time: 1_789_110_000, use_timestamps: true, gps_accuracy: 8, search_radius: 30 });
    expect(body).toHaveProperty('filters');
    expect(result.durationSeconds).toBe(60);
  });
  it('falls back to matched geometry and GPS elapsed time when edges are absent', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      shape: 'gfo}EtohhUxD@bAxJmGF', edges: [], matched_points: [],
    }), { status: 200 })));
    const result = await new ValhallaProvider('http://valhalla:8002').match({ profile: 'DRIVING', points: [
      { latitude: 23.8, longitude: 90.4, timestampSeconds: 1_789_110_000 },
      { latitude: 23.81, longitude: 90.41, timestampSeconds: 1_789_110_060 },
    ] });
    expect(result.distanceMeters).toBeGreaterThan(0); expect(result.durationSeconds).toBe(60);
  });
  it('does not invent duration for an untimed match without provider timing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      shape: 'gfo}EtohhUxD@bAxJmGF', edges: [], matched_points: [],
    }), { status: 200 })));
    await expect(new ValhallaProvider('http://valhalla:8002').match({ profile: 'DRIVING', points: [
      { latitude: 23.8, longitude: 90.4 }, { latitude: 23.81, longitude: 90.41 },
    ] })).rejects.toMatchObject({ provider: 'valhalla', status: 502, message: 'Matched duration missing' });
  });
  it('omits Valhalla timing controls for an incomplete GPS trace', async () => {
    const mock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ shape: 'matched', edges: [] }), { status: 200 })); vi.stubGlobal('fetch', mock);
    await new ValhallaProvider('http://valhalla:8002').match({ profile: 'DRIVING', points: [
      { latitude: 23.8, longitude: 90.4, timestampSeconds: 1_789_110_000 },
      { latitude: 23.81, longitude: 90.41 },
    ] });
    const body = JSON.parse(String(mock.mock.calls[0]![1]?.body)) as Record<string, unknown>;
    expect(body).not.toHaveProperty('begin_time'); expect(body).not.toHaveProperty('use_timestamps');
    expect(body.shape).toEqual([{ lat: 23.8, lon: 90.4 }, { lat: 23.81, lon: 90.41 }]);
  });
});
