import type { MatchRequest, MatrixRequest, RouteRequest } from '../contracts/navigation.js';
import { providerJson } from './http.js';
import { UpstreamError } from '../gateway/problem.js';

type VSummary = { length: number; time: number };
type VManeuver = { instruction: string; length: number; time: number; begin_shape_index: number; end_shape_index: number };
type VTrip = { trip: { summary: VSummary; legs: Array<{ shape: string; summary: VSummary; maneuvers?: VManeuver[] }> } };
type VMatrixCell = { distance?: number; time?: number };
type VMatrix = { sources_to_targets: VMatrixCell[][] };
const costing = { DRIVING: 'auto', BICYCLE: 'bicycle', WALKING: 'pedestrian' } as const;
const locations = (points: Array<{ latitude: number; longitude: number; timestampSeconds?: number | undefined }>) =>
  points.map((p) => ({ lat: p.latitude, lon: p.longitude, ...(p.timestampSeconds === undefined ? {} : { time: p.timestampSeconds }) }));
const post = <T>(base: string, path: string, body: unknown, timeout: number) => providerJson<T>(
  'valhalla', new URL(path, base), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }, timeout,
);

export class ValhallaProvider {
  constructor(private readonly baseUrl: string) {}

  async route(input: RouteRequest) {
    const data = await post<VTrip>(this.baseUrl, '/route', {
      locations: locations(input.points), costing: costing[input.profile], units: 'kilometers', language: input.language ?? 'en-US',
    }, 10_000);
    return {
      distanceMeters: data.trip.summary.length * 1_000, durationSeconds: data.trip.summary.time,
      legs: data.trip.legs.map((leg) => ({
        encodedPolyline6: leg.shape, distanceMeters: leg.summary.length * 1_000, durationSeconds: leg.summary.time,
        maneuvers: (leg.maneuvers ?? []).map((m) => ({ instruction: m.instruction, distanceMeters: m.length * 1_000,
          durationSeconds: m.time, beginShapeIndex: m.begin_shape_index, endShapeIndex: m.end_shape_index })),
      })),
    };
  }

  async match(input: MatchRequest) {
    const data = await post<VTrip>(this.baseUrl, '/trace_route', {
      shape: locations(input.points), costing: costing[input.profile], shape_match: 'map_snap', units: 'kilometers',
    }, 15_000);
    const shape = data.trip.legs[0]?.shape; if (!shape) throw new UpstreamError('valhalla', 502, 'Matched shape missing');
    return { encodedPolyline6: shape,
      distanceMeters: data.trip.summary.length * 1_000, durationSeconds: data.trip.summary.time };
  }

  async matrix(input: MatrixRequest) {
    const data = await post<VMatrix>(this.baseUrl, '/sources_to_targets', {
      sources: locations(input.sources), targets: locations(input.targets), costing: costing[input.profile], units: 'kilometers',
    }, 20_000);
    const map = (key: 'distance' | 'time', scale: number) => data.sources_to_targets.map((row) =>
      row.map((cell) => typeof cell[key] === 'number' ? cell[key]! * scale : null));
    return { distancesMeters: map('distance', 1_000), durationsSeconds: map('time', 1) };
  }
}
