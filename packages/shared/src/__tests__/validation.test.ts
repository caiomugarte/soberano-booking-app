import { describe, it, expect } from 'vitest';
import {
  bookingSchema,
  cancelAppointmentSchema,
  changeAppointmentSchema,
  barberLoginSchema,
} from '../validation.js';

const validBooking = {
  serviceId: '123e4567-e89b-12d3-a456-426614174000',
  barberId: '123e4567-e89b-12d3-a456-426614174001',
  date: '2026-06-15',
  startTime: '10:00',
  customerName: 'João Silva',
  customerPhone: '11999998888',
};

describe('bookingSchema', () => {
  it('accepts a valid booking', () => {
    expect(() => bookingSchema.parse(validBooking)).not.toThrow();
  });

  it('rejects non-UUID serviceId', () => {
    const result = bookingSchema.safeParse({ ...validBooking, serviceId: 'not-a-uuid' });
    expect(result.success).toBe(false);
  });

  it('rejects date in wrong format', () => {
    const result = bookingSchema.safeParse({ ...validBooking, date: '15/06/2026' });
    expect(result.success).toBe(false);
  });

  it('rejects time in wrong format', () => {
    const result = bookingSchema.safeParse({ ...validBooking, startTime: '1000' });
    expect(result.success).toBe(false);
  });

  it('rejects customer name shorter than 2 chars', () => {
    const result = bookingSchema.safeParse({ ...validBooking, customerName: 'J' });
    expect(result.success).toBe(false);
  });

  it('rejects phone with fewer than 10 digits', () => {
    const result = bookingSchema.safeParse({ ...validBooking, customerPhone: '119999' });
    expect(result.success).toBe(false);
  });

  it('accepts phone with 10 digits (landline)', () => {
    const result = bookingSchema.safeParse({ ...validBooking, customerPhone: '1199998888' });
    expect(result.success).toBe(true);
  });

  it('accepts phone with 11 digits (mobile)', () => {
    const result = bookingSchema.safeParse({ ...validBooking, customerPhone: '11999998888' });
    expect(result.success).toBe(true);
  });
});

describe('cancelAppointmentSchema', () => {
  it('accepts exactly 4 digits', () => {
    expect(() => cancelAppointmentSchema.parse({ phoneLastFour: '1234' })).not.toThrow();
  });

  it('rejects fewer than 4 chars', () => {
    const result = cancelAppointmentSchema.safeParse({ phoneLastFour: '123' });
    expect(result.success).toBe(false);
  });

  it('rejects more than 4 chars', () => {
    const result = cancelAppointmentSchema.safeParse({ phoneLastFour: '12345' });
    expect(result.success).toBe(false);
  });
});

describe('changeAppointmentSchema', () => {
  it('accepts valid change request', () => {
    const result = changeAppointmentSchema.safeParse({
      phoneLastFour: '8888',
      date: '2026-06-20',
      startTime: '14:30',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid time format', () => {
    const result = changeAppointmentSchema.safeParse({
      phoneLastFour: '8888',
      date: '2026-06-20',
      startTime: '25:00',
    });
    expect(result.success).toBe(false);
  });
});

describe('barberLoginSchema', () => {
  it('accepts valid credentials', () => {
    expect(() => barberLoginSchema.parse({ email: 'barber@soberano.com', password: 'senha123' })).not.toThrow();
  });

  it('rejects invalid email', () => {
    const result = barberLoginSchema.safeParse({ email: 'not-an-email', password: 'senha123' });
    expect(result.success).toBe(false);
  });

  it('rejects password shorter than 6 chars', () => {
    const result = barberLoginSchema.safeParse({ email: 'barber@soberano.com', password: '123' });
    expect(result.success).toBe(false);
  });
});
