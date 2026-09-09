import { UpstreamError } from '../gateway/problem.js';
import { upstreamFailures, upstreamLatency } from '../observability/metrics.js';

export const providerJson = async <T>(provider: string, url: URL, init: RequestInit, timeoutMs: number): Promise<T> => {
  const stop = upstreamLatency.startTimer({ provider });
  let response: globalThis.Response;
  try { response = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) }); }
  catch (error) { upstreamFailures.inc({ provider, kind: 'network' }); throw new UpstreamError(provider, 504, error instanceof Error ? error.message : 'Timeout'); }
  finally { stop(); }
  if (!response.ok) { upstreamFailures.inc({ provider, kind: 'response' }); throw new UpstreamError(provider, response.status >= 500 ? 502 : 422, `${provider} returned ${response.status}`); }
  try { return await response.json() as T; }
  catch { upstreamFailures.inc({ provider, kind: 'invalid-json' }); throw new UpstreamError(provider, 502, 'Invalid provider response'); }
};
