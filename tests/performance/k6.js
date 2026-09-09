/* global __ENV */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend } from 'k6/metrics';

const base = __ENV.MAPS_BASE_URL || 'https://maps.quantixlab.dev';
const secret = __ENV.MAPS_SERVER_KEY;
const publishable = __ENV.MAPS_PUBLISHABLE_KEY;
const trends = { search: new Trend('maps_search_ms'), route: new Trend('maps_route_ms'),
  match: new Trend('maps_match_ms'), matrix: new Trend('maps_matrix_ms') };
export const options = {
  scenarios: { mixed: { executor: 'constant-vus', vus: 100, duration: '15m' } },
  thresholds: { http_req_failed: ['rate<0.01'], maps_search_ms: ['p(95)<800'], maps_route_ms: ['p(95)<2000'],
    maps_match_ms: ['p(95)<3000'], maps_matrix_ms: ['p(95)<5000'] },
};
const auth = { headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' } };
const point = (index) => ({ latitude: 23.8103 - index * 0.0003, longitude: 90.4125 - index * 0.0002 });
const record = (name, response) => { trends[name].add(response.timings.duration); check(response, { [`${name} succeeded`]: (r) => r.status === 200 }); };

export default function () {
  const pick = Math.random();
  if (pick < 0.495) {
    const response = http.get(`${base}/v1/tiles/region/0/0/0.pbf`, { headers: { 'X-Quantix-Maps-Key': publishable } });
    check(response, { 'asset succeeded': (r) => r.status === 200 });
  } else if (pick < 0.745) {
    record('search', http.get(`${base}/v1/geocode/search?q=Dhaka&countryCode=BD`, auth));
  } else if (pick < 0.99) {
    record('route', http.post(`${base}/v1/routes`, JSON.stringify({ profile: 'DRIVING', points: [point(0), point(20)] }), auth));
  } else if (pick < 0.995) {
    record('match', http.post(`${base}/v1/matches`, JSON.stringify({ profile: 'DRIVING', points: Array.from({ length: 200 }, (_, i) => point(i)) }), auth));
  } else {
    const points = Array.from({ length: 10 }, (_, i) => point(i * 3));
    record('matrix', http.post(`${base}/v1/matrices`, JSON.stringify({ profile: 'DRIVING', sources: points, targets: points }), auth));
  }
  sleep(1);
}
