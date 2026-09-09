import { createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';

export type KeyType = 'publishable' | 'secret';
const prefix = (type: KeyType): string => type === 'publishable' ? 'qlm_pk' : 'qlm_sk';

export const hashSecret = (secret: string, pepper: string): string =>
  createHmac('sha256', pepper).update(secret).digest('hex');

export const createKey = (type: KeyType, pepper: string): { id: string; token: string; hash: string } => {
  const id = randomUUID().replaceAll('-', '').slice(0, 16);
  const secret = randomBytes(32).toString('base64url');
  return { id, token: `${prefix(type)}_${id}_${secret}`, hash: hashSecret(secret, pepper) };
};

export const parseKey = (token: string): { type: KeyType; id: string; secret: string } | undefined => {
  const match = /^(qlm_pk|qlm_sk)_([a-zA-Z0-9]{6,64})_([a-zA-Z0-9_-]{32,})$/.exec(token);
  if (!match?.[1] || !match[2] || !match[3]) return undefined;
  return { type: match[1] === 'qlm_pk' ? 'publishable' : 'secret', id: match[2], secret: match[3] };
};

export const hashesEqual = (actual: string, expected: string): boolean => {
  const left = Buffer.from(actual, 'hex');
  const right = Buffer.from(expected, 'hex');
  return left.length === right.length && timingSafeEqual(left, right);
};
