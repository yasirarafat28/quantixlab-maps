import type { NextFunction, Request, Response } from 'express';
import type { ProjectStore } from './project-store.js';
import type { Scope } from './types.js';
import { problem } from '../gateway/problem.js';

export const authorize = (store: ProjectStore, kind: 'publishable' | 'secret', scope: Scope) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const token = kind === 'publishable'
        ? req.header('X-Quantix-Maps-Key')
        : req.header('Authorization')?.replace(/^Bearer\s+/i, '');
      const principal = token ? await store.authenticate(token) : undefined;
      if (!principal || principal.key.type !== kind) return problem(res, req, 401, 'authentication', 'Authentication required');
      if (!principal.key.scopes.includes(scope)) return problem(res, req, 403, 'scope', 'Insufficient key scope');
      req.principal = principal;
      next();
    } catch (error) { next(error); }
  };
