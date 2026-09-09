import { describe, expect, it } from 'vitest';
import { createOpenApiDocument } from '../src/contracts/openapi.js';

describe('OpenAPI contract', () => {
  it('contains every stable v1 operation and security scheme', () => {
    const document = createOpenApiDocument() as any;
    for (const path of ['/v1/catalog', '/v1/geocode/search', '/v1/geocode/reverse', '/v1/routes', '/v1/matches', '/v1/matrices', '/v1/usage']) {
      expect(document.paths[path]).toBeDefined();
    }
    expect(document.components.securitySchemes).toHaveProperty('PublishableKey');
    expect(document.openapi).toBe('3.1.0');
  });
});
