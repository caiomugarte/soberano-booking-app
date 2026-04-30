import { describe, expect, it } from 'vitest';
import { resolveApiBaseUrl } from '../api.ts';

describe('resolveApiBaseUrl', () => {
  it('defaults to same-origin /api when no explicit API origin is provided', () => {
    expect(resolveApiBaseUrl('')).toBe('/api');
  });

  it('uses the explicit API origin override when provided', () => {
    expect(resolveApiBaseUrl('http://localhost:3000')).toBe('http://localhost:3000/api');
  });
});
