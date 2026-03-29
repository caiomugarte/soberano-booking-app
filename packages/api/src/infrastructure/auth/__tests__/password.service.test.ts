import { describe, it, expect } from 'vitest';
import { hashPassword, comparePassword } from '../password.service.js';

describe('hashPassword', () => {
  it('returns a string different from the original', async () => {
    const hash = await hashPassword('minhasenha');
    expect(hash).not.toBe('minhasenha');
  });

  it('produces a bcrypt hash (starts with $2)', async () => {
    const hash = await hashPassword('minhasenha');
    expect(hash.startsWith('$2')).toBe(true);
  });

  it('generates different hashes for the same password (salt randomness)', async () => {
    const hash1 = await hashPassword('minhasenha');
    const hash2 = await hashPassword('minhasenha');
    expect(hash1).not.toBe(hash2);
  });
});

describe('comparePassword', () => {
  it('returns true for the correct password', async () => {
    const hash = await hashPassword('correta');
    expect(await comparePassword('correta', hash)).toBe(true);
  });

  it('returns false for a wrong password', async () => {
    const hash = await hashPassword('correta');
    expect(await comparePassword('errada', hash)).toBe(false);
  });
});
