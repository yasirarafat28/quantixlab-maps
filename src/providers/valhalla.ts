import type { MatchRequest, MatrixRequest, RouteRequest } from '../contracts/navigation.js';
import { providerJson } from './http.js';
import { UpstreamError } from '../gateway/problem.js';

type VSummary = { length: number; time: number };
type VSign = { text?: string };
type VManeuver = { instruction: string; length: number; time: number; begin_shape_index: number; end_shape_index: number;
  type?: number; street_names?: string[]; verbal_transition_alert_instruction?: string;
  verbal_pre_transition_instruction?: string; verbal_post_transition_instruction?: string;
  sign?: Record<string, VSign[] | undefined> };
type VTrip = { trip: { summary: VSummary; legs: Array<{ shape: string; summary: VSummary; maneuvers?: VManeuver[] }> } };
type VMatchedPoint = { lat: number; lon: number; type: string; edge_index?: number;
  distance_along_edge?: number; distance_from_trace_point?: number };
type VTrace = { shape?: string; matched_points?: VMatchedPoint[]; edges?: Array<{ length?: number; speed?: number }>;
  shape_attributes?: { time?: number[] } };
type VMatrixCell = { distance?: number; time?: number };
type VMatrix = { sources_to_targets: VMatrixCell[][] };
const costing = { DRIVING: 'auto', BICYCLE: 'bicycle', WALKING: 'pedestrian' } as const;
const locations = (points: Array<{ latitude: number; longitude: number; timestampSeconds?: number | undefined;
  headingDegrees?: number | undefined; headingToleranceDegrees?: number | undefined; radiusMeters?: number | undefined }>) => points.map((p) => ({
    lat: p.latitude, lon: p.longitude, ...(p.timestampSeconds === undefined ? {} : { time: p.timestampSeconds }),
    ...(p.headingDegrees === undefined ? {} : { heading: p.headingDegrees }),
    ...(p.headingToleranceDegrees === undefined ? {} : { heading_tolerance: p.headingToleranceDegrees }),
    ...(p.radiusMeters === undefined ? {} : { radius: p.radiusMeters }),
  }));
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
          durationSeconds: m.time, beginShapeIndex: m.begin_shape_index, endShapeIndex: m.end_shape_index,
          ...(m.type === undefined ? {} : { type: m.type }), ...(m.street_names ? { streetNames: m.street_names } : {}),
          ...(m.verbal_transition_alert_instruction ? { verbalTransitionAlertInstruction: m.verbal_transition_alert_instruction } : {}),
          ...(m.verbal_pre_transition_instruction ? { verbalPreTransitionInstruction: m.verbal_pre_transition_instruction } : {}),
          ...(m.verbal_post_transition_instruction ? { verbalPostTransitionInstruction: m.verbal_post_transition_instruction } : {}),
          ...(m.sign ? { signText: Object.values(m.sign).flat().flatMap((sign) => sign?.text ? [sign.text] : []) } : {}) })),
      })),
    };
  }

  async match(input: MatchRequest) {
    const timestamps = input.points.map((point) => point.timestampSeconds);
    const useTimestamps = timestamps.every((value) => value !== undefined)
      && timestamps.every((value, index) => index === 0 || value! >= timestamps[index - 1]!);
    const data = await post<VTrace>(this.baseUrl, '/trace_attributes', {
      shape: input.points.map((point) => ({
        lat: point.latitude, lon: point.longitude,
        ...(useTimestamps ? { time: point.timestampSeconds } : {}),
      })),
      costing: costing[input.profile], shape_match: 'map_snap', units: 'kilometers',
      ...(input.gpsAccuracyM === undefined ? {} : { gps_accuracy: input.gpsAccuracyM }),
      ...(input.searchRadiusM === undefined ? {} : { search_radius: input.searchRadiusM }),
      ...(useTimestamps ? { begin_time: timestamps[0], use_timestamps: true } : {}),
      filters: { action: 'include', attributes: ['shape', 'matched.point', 'matched.type', 'matched.edge_index',
        'matched.distance_along_edge', 'matched.distance_from_trace_point', 'edge.length', 'edge.speed', 'shape_attributes.time'] },
    }, 15_000);
    if (!data.shape) throw new UpstreamError('valhalla', 502, 'Matched shape missing');
    const distanceMeters = (data.edges ?? []).reduce((sum, edge) => sum + (edge.length ?? 0) * 1_000, 0);
    const times = data.shape_attributes?.time ?? [];
    const durationSeconds = times.length > 0 ? times[times.length - 1]! : (data.edges ?? []).reduce(
      (sum, edge) => sum + (edge.speed && edge.length ? edge.length / edge.speed * 3_600 : 0), 0);
    return { encodedPolyline6: data.shape, distanceMeters, durationSeconds,
      matchedPoints: (data.matched_points ?? []).map((point) => ({ latitude: point.lat, longitude: point.lon,
        matchType: matchType(point.type), ...(point.edge_index === undefined ? {} : { edgeIndex: point.edge_index }),
        ...(point.distance_along_edge === undefined ? {} : { distanceAlongEdge: point.distance_along_edge }),
        ...(point.distance_from_trace_point === undefined ? {} : { distanceFromTracePointM: point.distance_from_trace_point }) })) };
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

const matchType = (value: string): 'MATCHED' | 'INTERPOLATED' | 'UNMATCHED' =>
  value === 'matched' ? 'MATCHED' : value === 'interpolated' ? 'INTERPOLATED' : 'UNMATCHED';
