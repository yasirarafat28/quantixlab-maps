import type { NextFunction, Request, Response } from 'express';
import type { RedisLike } from './redis.js';
import { problem } from '../gateway/problem.js';

const ACQUIRE = `local n=redis.call('INCR',KEYS[1]); redis.call('EXPIRE',KEYS[1],ARGV[1]); if n>tonumber(ARGV[2]) then redis.call('DECR',KEYS[1]); return 0 end; return 1`;

export const concurrencyLimit = (redis: RedisLike, operation: 'match' | 'matrix') =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const key = `concurrency:${req.principal!.project.id}:${operation}`;
    try {
      const acquired = await redis.eval(ACQUIRE, { keys: [key], arguments: ['30', '2'] });
      if (acquired !== 1) return problem(res, req, 429, 'concurrency-limit', 'Concurrent request limit exceeded');
      let released = false;
      const release = () => { if (!released) { released = true; void redis.decr(key); } };
      res.once('finish', release); res.once('close', release); next();
    } catch (error) { next(error); }
  };
