import type { Request, Response } from 'express';

export const problem = (res: Response, req: Request, status: number, code: string, title: string, detail?: string): void => {
  res.status(status).type('application/problem+json').json({
    type: `https://maps.quantixlab.dev/problems/${code}`, title, status, requestId: req.requestId, ...(detail ? { detail } : {}),
  });
};

export class UpstreamError extends Error {
  constructor(public readonly provider: string, public readonly status: number, message: string) { super(message); }
}
