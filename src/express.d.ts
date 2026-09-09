import type { Principal } from './auth/types.js';

declare module 'express-serve-static-core' {
  interface Request {
    principal?: Principal;
    requestId: string;
    datasetVersion: string;
    upstreamOutcome?: string;
  }
}
