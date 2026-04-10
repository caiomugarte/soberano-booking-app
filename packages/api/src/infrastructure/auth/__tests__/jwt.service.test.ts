import { describe, it, expect } from 'vitest';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from '../jwt.service.js';

describe('generateAccessToken / verifyAccessToken', () => {
  it('generates a non-empty string', () => {
    const token = generateAccessToken('provider-123', 'tenant-abc');
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);
  });

  it('verifies the token and returns the correct providerId', () => {
    const token = generateAccessToken('provider-abc', 'tenant-xyz');
    const payload = verifyAccessToken(token);
    expect(payload.providerId).toBe('provider-abc');
    expect(payload.tenantId).toBe('tenant-xyz');
  });

  it('throws on an invalid token', () => {
    expect(() => verifyAccessToken('invalid.token.here')).toThrow();
  });

  it('throws on a tampered token', () => {
    const token = generateAccessToken('provider-abc', 'tenant-xyz');
    const tampered = token.slice(0, -4) + 'xxxx';
    expect(() => verifyAccessToken(tampered)).toThrow();
  });
});

describe('generateRefreshToken / verifyRefreshToken', () => {
  it('generates a non-empty string', () => {
    const token = generateRefreshToken('provider-123', 'tenant-abc');
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);
  });

  it('verifies the refresh token and returns the correct providerId', () => {
    const token = generateRefreshToken('provider-xyz', 'tenant-abc');
    const payload = verifyRefreshToken(token);
    expect(payload.providerId).toBe('provider-xyz');
    expect(payload.tenantId).toBe('tenant-abc');
  });

  it('access token cannot be verified as a refresh token', () => {
    const accessToken = generateAccessToken('provider-abc', 'tenant-xyz');
    expect(() => verifyRefreshToken(accessToken)).toThrow();
  });
});
