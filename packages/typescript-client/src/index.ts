import type { paths } from './schema.js';

export type RouteRequest = NonNullable<paths['/v1/routes']['post']['requestBody']>['content']['application/json'];
export type RouteResponse = paths['/v1/routes']['post']['responses']['200']['content']['application/json'];
export type MatchRequest = NonNullable<paths['/v1/matches']['post']['requestBody']>['content']['application/json'];
export type MatrixRequest = NonNullable<paths['/v1/matrices']['post']['requestBody']>['content']['application/json'];

export class QuantixMapsClient {
  constructor(private readonly key: string, private readonly baseUrl = 'https://maps.quantixlab.dev') {}
  assetHeaders(): Record<string, string> { return { 'X-Quantix-Maps-Key': this.key }; }
  async route(body: RouteRequest): Promise<RouteResponse> { return this.post('/v1/routes', body); }
  async match(body: MatchRequest) { return this.post('/v1/matches', body); }
  async matrix(body: MatrixRequest) { return this.post('/v1/matrices', body); }
  async search(query: Record<string, string | number>) {
    const url = new URL('/v1/geocode/search', this.baseUrl);
    Object.entries(query).forEach(([name, value]) => url.searchParams.set(name, String(value)));
    return this.request(url);
  }
  async reverse(query: { latitude: number; longitude: number; language?: string; radiusMeters?: number; limit?: number }) {
    const values = Object.fromEntries(Object.entries(query).filter(([, value]) => value !== undefined)) as Record<string, string | number>;
    const url = new URL('/v1/geocode/reverse', this.baseUrl);
    Object.entries(values).forEach(([name, value]) => url.searchParams.set(name, String(value)));
    return this.request(url);
  }
  private async post(path: string, body: unknown) { return this.request(new URL(path, this.baseUrl), { method: 'POST', body: JSON.stringify(body) }); }
  private async request(url: URL, init: RequestInit = {}) {
    const response = await fetch(url, { ...init, headers: { Authorization: `Bearer ${this.key}`, 'Content-Type': 'application/json', ...init.headers } });
    const value = await response.json(); if (!response.ok) throw Object.assign(new Error(value.title ?? 'Maps request failed'), { problem: value }); return value;
  }
}
