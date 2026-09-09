import type { NextFunction, Request, Response } from 'express';
import type { ZodType } from 'zod';
import { problem } from './problem.js';

export const validate = (schema: ZodType, source: 'body' | 'query' = 'body') =>
  (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      problem(res, req, 422, 'validation', 'Request validation failed', result.error.issues.map((i) => i.message).join('; '));
      return;
    }
    req[source] = result.data;
    next();
  };

export const bodyLimit = (req: Request, res: Response, next: NextFunction): void => {
  const max = req.path === '/v1/matches' ? 1_048_576 : 262_144;
  const length = Number(req.header('content-length') ?? 0);
  if (length > max) return problem(res, req, 413, 'payload-too-large', 'Request payload too large');
  next();
};
