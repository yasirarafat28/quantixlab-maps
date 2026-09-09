import type { NextFunction, Request, Response } from 'express';
import { active, latency, requests } from './metrics.js';

export const observe = (req: Request, res: Response, next: NextFunction): void => {
  const operation = req.path.split('/').filter(Boolean).slice(0, 2).join('.') || 'root';
  const started = process.hrtime.bigint(); active.inc({ operation });
  res.once('finish', () => {
    const seconds = Number(process.hrtime.bigint() - started) / 1e9;
    const project = req.principal?.project.id ?? 'anonymous';
    active.dec({ operation }); latency.observe({ operation }, seconds); requests.inc({ operation, status: res.statusCode, project });
    process.stdout.write(`${JSON.stringify({ timestamp: new Date().toISOString(), requestId: req.requestId,
      projectId: project, operation, status: res.statusCode, latencyMs: Math.round(seconds * 1_000),
      requestBytes: Number(req.header('content-length') ?? 0), datasetVersion: req.datasetVersion,
      upstreamOutcome: req.upstreamOutcome ?? 'not-used' })}\n`);
  });
  next();
};
