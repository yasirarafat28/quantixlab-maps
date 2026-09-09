import type { NextFunction, Request, Response } from 'express';
import type { RateStore } from './store.js';
import { problem } from '../gateway/problem.js';
import { rateLimitRejections } from '../observability/metrics.js';

export const LIMITS = { assets: 1_200, geocode: 120, route: 60, match: 10, matrix: 10, usage: 60 } as const;
export type Operation = keyof typeof LIMITS;

export const rateLimit = (store: RateStore, operation: Operation) => async (req: Request, res: Response, next: NextFunction) => {
  try {
    const project = req.principal!.project;
    const limit = project.quotas[operation] ?? LIMITS[operation];
    const subject = operation === 'assets' ? `${project.id}:${req.principal!.key.id}:${req.ip}` : project.id;
    const state = await store.take(subject, operation, limit);
    const reset = Math.ceil((Date.now() + state.retryMs) / 1_000);
    res.set({ 'RateLimit-Limit': String(limit), 'RateLimit-Remaining': String(state.remaining), 'RateLimit-Reset': String(reset) });
    if (!state.allowed) { rateLimitRejections.inc({ operation }); res.set('Retry-After', String(Math.max(1, Math.ceil(state.retryMs / 1_000)))); return problem(res, req, 429, 'rate-limit', 'Rate limit exceeded'); }
    await store.incrementUsage(project.id, operation); next();
  } catch (error) { next(error); }
};
