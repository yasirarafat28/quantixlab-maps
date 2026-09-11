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
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ trip: { summary: { length: 2, time: 120 },
      legs: [{ shape: 'polyline', summary: { length: 2, time: 120 }, maneuvers: [{ instruction: 'Continue', length: 0.5, time: 30, begin_shape_index: 0, end_shape_index: 2 }] }] } }), { status: 200 })));
    const result = await new ValhallaProvider('http://valhalla:8002').route({ profile: 'WALKING', points: [{ latitude: 23.8, longitude: 90.4 }, { latitude: 23.7, longitude: 90.3 }] });
    expect(result.distanceMeters).toBe(2_000); expect(result.legs[0]?.maneuvers[0]?.distanceMeters).toBe(500);
  });
  it('enables Valhalla timestamps for a complete monotonic GPS trace', async () => {
    const mock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ trip: {
      summary: { length: 1, time: 60 }, legs: [{ shape: 'matched', summary: { length: 1, time: 60 } }],
    } }), { status: 200 })); vi.stubGlobal('fetch', mock);
    await new ValhallaProvider('http://valhalla:8002').match({ profile: 'DRIVING', points: [
      { latitude: 23.8, longitude: 90.4, timestampSeconds: 1_789_110_000 },
      { latitude: 23.81, longitude: 90.41, timestampSeconds: 1_789_110_060 },
    ] });
    const body = JSON.parse(String(mock.mock.calls[0]![1]?.body)) as Record<string, unknown>;
    expect(body).toMatchObject({ begin_time: 1_789_110_000, use_timestamps: true });
  });
  it('omits Valhalla timing controls for an incomplete GPS trace', async () => {
    const mock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ trip: {
      summary: { length: 1, time: 60 }, legs: [{ shape: 'matched', summary: { length: 1, time: 60 } }],
    } }), { status: 200 })); vi.stubGlobal('fetch', mock);
    await new ValhallaProvider('http://valhalla:8002').match({ profile: 'DRIVING', points: [
      { latitude: 23.8, longitude: 90.4, timestampSeconds: 1_789_110_000 },
      { latitude: 23.81, longitude: 90.41 },
    ] });
    const body = JSON.parse(String(mock.mock.calls[0]![1]?.body)) as Record<string, unknown>;
    expect(body).not.toHaveProperty('begin_time'); expect(body).not.toHaveProperty('use_timestamps');
    expect(body.shape).toEqual([{ lat: 23.8, lon: 90.4 }, { lat: 23.81, lon: 90.41 }]);
  });
});
