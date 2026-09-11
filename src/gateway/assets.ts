import { join, resolve } from 'node:path';
import type { Request, Response } from 'express';
import { problem, UpstreamError } from './problem.js';

const safeFile = (root: string, ...parts: string[]): string | undefined => {
  const base = resolve(root); const candidate = resolve(join(base, ...parts));
  return candidate.startsWith(`${base}/`) ? candidate : undefined;
};

export const sendAsset = (root: string, folder: string) => (req: Request, res: Response): void => {
  const parameter = req.params.path ?? req.params.file ?? '';
  const relative = Array.isArray(parameter) ? parameter.join('/') : String(parameter);
  const file = safeFile(root, folder, relative);
  if (!file) { res.sendStatus(404); return; }
  res.set('Cache-Control', folder === 'styles'
    ? 'public, max-age=0, must-revalidate'
    : 'public, max-age=2592000, immutable');
  res.sendFile(file, (error) => { if (error && !res.headersSent) problem(res, req, 404, 'not-found', 'Asset not found'); });
};

export const proxyMartin = (baseUrl: string, publicBaseUrl: string) => async (req: Request, res: Response): Promise<void> => {
  const raw = req.originalUrl.replace(/^\/v1\/tiles\//, '/').split('?')[0] ?? '/';
  const tileJson = raw.endsWith('.json'); const suffix = raw.replace(/\.(json|pbf)$/, '');
  let upstream: globalThis.Response;
  try { upstream = await fetch(new URL(suffix, baseUrl), { signal: AbortSignal.timeout(10_000) }); }
  catch (error) { throw new UpstreamError('martin', 504, error instanceof Error ? error.message : 'Timeout'); }
  req.upstreamOutcome = upstream.ok ? 'martin:success' : 'martin:failure';
  if (!upstream.ok) {
    if (upstream.status === 404) return problem(res, req, 404, 'not-found', 'Tile resource not found');
    throw new UpstreamError('martin', 502, `Martin returned ${upstream.status}`);
  }
  res.status(upstream.status).set('Cache-Control', 'public, max-age=2592000, immutable');
  const contentType = upstream.headers.get('content-type'); if (contentType) res.type(contentType);
  if (tileJson && upstream.ok) {
    const value = await upstream.json() as Record<string, unknown>; const source = suffix.slice(1);
    res.json({ ...value, tiles: [`${publicBaseUrl}/v1/tiles/${source}/{z}/{x}/{y}.pbf`] }); return;
  }
  res.send(Buffer.from(await upstream.arrayBuffer()));
};
