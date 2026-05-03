import { describe, expect, it } from 'vitest';
import { API_BASE } from '../api.ts';

describe('API_BASE', () => {
  it('always uses the same-origin api path', () => {
    expect(API_BASE).toBe('/api');
  });
});
