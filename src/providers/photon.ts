import type { ReverseQuery, SearchQuery } from '../contracts/geocode.js';
import { providerJson } from './http.js';

type Feature = { geometry: { coordinates: [number, number] }; properties: Record<string, unknown> };
type PhotonResponse = { features?: Feature[] };
const text = (p: Record<string, unknown>, key: string): string | undefined => typeof p[key] === 'string' ? p[key] : undefined;

const normalize = (feature: Feature) => {
  const p = feature.properties;
  const parts = [text(p, 'city'), text(p, 'state'), text(p, 'country')].filter(Boolean);
  return {
    id: p.osm_id === undefined ? `${feature.geometry.coordinates[1]},${feature.geometry.coordinates[0]}` : `${String(p.osm_type ?? 'O')}:${String(p.osm_id)}`,
    name: text(p, 'name') ?? parts[0] ?? 'Unnamed place', secondaryLabel: parts.join(', '),
    point: { latitude: feature.geometry.coordinates[1], longitude: feature.geometry.coordinates[0] },
    ...(text(p, 'countrycode') ? { countryCode: text(p, 'countrycode')!.toUpperCase() } : {}),
    ...(text(p, 'state') ? { state: text(p, 'state') } : {}), ...(text(p, 'county') ? { county: text(p, 'county') } : {}),
    ...(text(p, 'city') ? { city: text(p, 'city') } : {}), ...(text(p, 'postcode') ? { postcode: text(p, 'postcode') } : {}),
    ...(text(p, 'street') ? { street: text(p, 'street') } : {}), ...(text(p, 'housenumber') ? { houseNumber: text(p, 'housenumber') } : {}),
  };
};

export class PhotonProvider {
  constructor(private readonly baseUrl: string) {}
  async search(query: SearchQuery) {
    const url = new URL('/api', this.baseUrl);
    url.searchParams.set('q', query.q); url.searchParams.set('limit', String(query.limit));
    if (query.countryCode) url.searchParams.set('countrycode', query.countryCode);
    if (query.latitude !== undefined) { url.searchParams.set('lat', String(query.latitude)); url.searchParams.set('lon', String(query.longitude)); }
    if (query.language) url.searchParams.set('lang', query.language);
    return (await providerJson<PhotonResponse>('photon', url, {}, 5_000)).features?.map(normalize) ?? [];
  }
  async reverse(query: ReverseQuery) {
    const url = new URL('/reverse', this.baseUrl);
    url.searchParams.set('lat', String(query.latitude)); url.searchParams.set('lon', String(query.longitude));
    url.searchParams.set('radius', String(query.radiusMeters / 1_000)); url.searchParams.set('limit', String(query.limit));
    if (query.language) url.searchParams.set('lang', query.language);
    return (await providerJson<PhotonResponse>('photon', url, {}, 5_000)).features?.map(normalize) ?? [];
  }
}
