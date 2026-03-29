import { describe, it, expect } from 'vitest';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from '../jwt.service.js';

describe('generateAccessToken / verifyAccessToken', () => {
  it('generates a non-empty string', () => {
    const token = generateAccessToken('barber-123');
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);
  });

  it('verifies the token and returns the correct barberId', () => {
    const token = generateAccessToken('barber-abc');
    const payload = verifyAccessToken(token);
    expect(payload.barberId).toBe('barber-abc');
  });

  it('throws on an invalid token', () => {
    expect(() => verifyAccessToken('invalid.token.here')).toThrow();
  });

  it('throws on a tampered token', () => {
    const token = generateAccessToken('barber-abc');
    const tampered = token.slice(0, -4) + 'xxxx';
    expect(() => verifyAccessToken(tampered)).toThrow();
  });
});

describe('generateRefreshToken / verifyRefreshToken', () => {
  it('generates a non-empty string', () => {
    const token = generateRefreshToken('barber-123');
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);
  });

  it('verifies the refresh token and returns the correct barberId', () => {
    const token = generateRefreshToken('barber-xyz');
    const payload = verifyRefreshToken(token);
    expect(payload.barberId).toBe('barber-xyz');
  });

  it('access token cannot be verified as a refresh token', () => {
    const accessToken = generateAccessToken('barber-abc');
    expect(() => verifyRefreshToken(accessToken)).toThrow();
  });
});
