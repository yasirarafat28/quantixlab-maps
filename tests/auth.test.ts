import { describe, expect, it } from 'vitest';
import { createKey, hashesEqual, parseKey } from '../src/auth/crypto.js';

describe('map credentials', () => {
  it('creates parseable keys without storing the secret', () => {
    const value = createKey('secret', 'x'.repeat(32)); const parsed = parseKey(value.token);
    expect(parsed).toMatchObject({ type: 'secret', id: value.id });
    expect(value.hash).toMatch(/^[a-f0-9]{64}$/); expect(value.hash).not.toContain(parsed!.secret);
  });
  it('rejects malformed keys and compares hashes', () => {
    expect(parseKey('qlm_sk_bad')).toBeUndefined(); expect(hashesEqual('ab'.repeat(32), 'ab'.repeat(32))).toBe(true);
    expect(hashesEqual('ab'.repeat(32), 'cd'.repeat(32))).toBe(false);
  });
});
