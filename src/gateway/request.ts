import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import type { NextFunction, Request, Response } from 'express';

export const datasetVersion = async (root: string): Promise<string> => {
  try { return JSON.parse(await readFile(`${root}/manifest.json`, 'utf8')).releaseId ?? 'unknown'; }
  catch { return 'unavailable'; }
};

export const datasetCreatedAt = async (root: string): Promise<number | undefined> => {
  try { const value = JSON.parse(await readFile(`${root}/manifest.json`, 'utf8')).createdAt; const timestamp = Date.parse(value); return Number.isFinite(timestamp) ? timestamp : undefined; }
  catch { return undefined; }
};

export const requestContext = (version: string) => (req: Request, res: Response, next: NextFunction): void => {
  req.requestId = req.header('X-Request-Id')?.slice(0, 100) || randomUUID();
  req.datasetVersion = version;
  res.set({ 'X-Request-Id': req.requestId, 'X-Maps-Dataset-Version': version });
  next();
};
