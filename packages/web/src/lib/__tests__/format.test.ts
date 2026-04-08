import { describe, it, expect } from 'vitest';
import {
  formatPhone, stripPhone, formatCurrency, dateToString,
  formatDateShort, formatDateLong,
  getWeekDates, getWeekLabel,
  getAdminWeekDates,
  getMonthCalendarDays,
  getMonthLabel,
  getYearLabel,
} from '../format.ts';

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

describe('formatDateShort', () => {
  it('formats a Monday in June', () => {
    // 2026-06-15 is a Monday (Seg)
    expect(formatDateShort('2026-06-15')).toBe('Seg, 15 Jun');
  });

  it('formats New Year\'s Day (Thursday)', () => {
    // 2026-01-01 is a Thursday (Qui)
    expect(formatDateShort('2026-01-01')).toBe('Qui, 1 Jan');
  });
});

describe('formatDateLong', () => {
  it('formats a Monday in June with long weekday', () => {
    // 2026-06-15 is a Monday (Segunda-feira)
    expect(formatDateLong('2026-06-15')).toBe('Segunda-feira, 15/06');
  });

  it('formats Christmas Day (Friday)', () => {
    // 2026-12-25 is a Friday (Sexta-feira)
    expect(formatDateLong('2026-12-25')).toBe('Sexta-feira, 25/12');
  });
});

describe('getWeekDates', () => {
  it('returns an array of length 7', () => {
    expect(getWeekDates(0)).toHaveLength(7);
  });

  it('each element is a Date', () => {
    const dates = getWeekDates(0);
    dates.forEach(d => expect(d).toBeInstanceOf(Date));
  });

  it('offset 1 first element is 7 days after offset 0 first element', () => {
    const week0 = getWeekDates(0);
    const week1 = getWeekDates(1);
    const diffMs = week1[0].getTime() - week0[0].getTime();
    expect(diffMs).toBe(7 * 24 * 60 * 60 * 1000);
  });
});

describe('getWeekLabel', () => {
  it('returns formatted range label for a week starting Apr 6 2026', () => {
    // Build 7 dates: Apr 6 – Apr 12, 2026
    const dates = Array.from({ length: 7 }, (_, i) => new Date(2026, 3, 6 + i));
    expect(getWeekLabel(dates)).toBe('6 Abr — 12 Abr');
  });
});

describe('getAdminWeekDates', () => {
  it('returns an array of length 7', () => {
    expect(getAdminWeekDates(0)).toHaveLength(7);
  });

  it('index 0 is always a Monday', () => {
    const dates = getAdminWeekDates(0);
    expect(dates[0].getDay()).toBe(1);
  });
});

describe('getMonthCalendarDays', () => {
  it('total length is a multiple of 7', () => {
    const days = getMonthCalendarDays(0);
    expect(days.length % 7).toBe(0);
  });

  it('first non-null entry is the 1st of the current month', () => {
    const days = getMonthCalendarDays(0);
    const firstNonNull = days.find(d => d !== null) as Date;
    expect(firstNonNull).toBeInstanceOf(Date);
    expect(firstNonNull.getDate()).toBe(1);
    const today = new Date();
    expect(firstNonNull.getMonth()).toBe(today.getMonth());
    expect(firstNonNull.getFullYear()).toBe(today.getFullYear());
  });

  it('leading null count equals (firstDay.getDay() + 6) % 7', () => {
    const days = getMonthCalendarDays(0);
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const expectedPad = (firstDay.getDay() + 6) % 7;
    const leadingNulls = days.findIndex(d => d !== null);
    expect(leadingNulls).toBe(expectedPad);
  });
});

describe('getMonthLabel', () => {
  it('returns "Abril 2026" for offset 0 (today is 2026-04-07)', () => {
    expect(getMonthLabel(0)).toBe('Abril 2026');
  });

  it('returns "Maio 2026" for offset 1', () => {
    expect(getMonthLabel(1)).toBe('Maio 2026');
  });
});

describe('getYearLabel', () => {
  it('returns 2026 for offset 0 (today is 2026-04-07)', () => {
    expect(getYearLabel(0)).toBe(2026);
  });

  it('returns 2025 for offset -1', () => {
    expect(getYearLabel(-1)).toBe(2025);
  });
});
