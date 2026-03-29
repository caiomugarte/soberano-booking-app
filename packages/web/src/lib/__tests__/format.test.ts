import { describe, it, expect } from 'vitest';
import { formatPhone, stripPhone, formatCurrency, formatDateShort, dateToString } from '../format.ts';

describe('formatPhone', () => {
  it('returns empty string for empty input', () => {
    expect(formatPhone('')).toBe('');
  });

  it('opens paren after 2 digits', () => {
    expect(formatPhone('119')).toBe('(11) 9');
  });

  it('does not add dash with exactly 7 digits', () => {
    expect(formatPhone('1199998')).toBe('(11) 99998');
  });

  it('adds dash at the correct position (after 7th digit)', () => {
    expect(formatPhone('119999888')).toBe('(11) 99998-88');
  });

  it('formats full 11-digit mobile number', () => {
    expect(formatPhone('11999998888')).toBe('(11) 99999-8888');
  });

  it('formats full 10-digit landline', () => {
    expect(formatPhone('1133334444')).toBe('(11) 33334-444');
  });

  it('ignores non-digit characters in input', () => {
    expect(formatPhone('(11) 99999-8888')).toBe('(11) 99999-8888');
  });

  it('truncates beyond 11 digits', () => {
    expect(formatPhone('119999988889999')).toBe('(11) 99999-8888');
  });
});

describe('stripPhone', () => {
  it('removes all non-digit characters', () => {
    expect(stripPhone('(11) 99999-8888')).toBe('11999998888');
  });

  it('returns digits unchanged', () => {
    expect(stripPhone('11999998888')).toBe('11999998888');
  });

  it('returns empty string for empty input', () => {
    expect(stripPhone('')).toBe('');
  });
});

describe('formatCurrency', () => {
  it('formats cents as BRL', () => {
    expect(formatCurrency(1000)).toBe('R$ 10,00');
  });

  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('R$ 0,00');
  });

  it('formats odd cents', () => {
    expect(formatCurrency(2550)).toBe('R$ 25,50');
  });
});

describe('dateToString', () => {
  it('converts a Date to YYYY-MM-DD string', () => {
    const d = new Date('2026-06-15T00:00:00');
    expect(dateToString(d)).toBe('2026-06-15');
  });
});
