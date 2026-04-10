import { describe, it, expect, vi } from 'vitest';
import { GetAvailableSlots } from '../get-available-slots.js';
import type { AppointmentRepository } from '../../../../domain/repositories/appointment.repository.js';
import type { BarberShiftRepository } from '../../../../domain/repositories/barber-shift.repository.js';

// A Monday in the future
const FUTURE_MONDAY = '2026-06-15';

function makeRepos(overrides?: {
  shifts?: { startTime: string; endTime: string }[];
  booked?: string[];
  absences?: { startTime: string | null; endTime: string | null }[];
}) {
  const shiftRepo = {
    findByBarberAndDay: vi.fn().mockResolvedValue(overrides?.shifts ?? [{ startTime: '09:00', endTime: '12:00' }]),
    findAbsencesByBarberAndDate: vi.fn().mockResolvedValue(overrides?.absences ?? []),
    findAllByBarber: vi.fn(),
    replaceForBarber: vi.fn(),
    findAbsencesByBarber: vi.fn(),
    createAbsence: vi.fn(),
    deleteAbsence: vi.fn(),
  } as unknown as BarberShiftRepository;

  const appointmentRepo = {
    findBookedSlots: vi.fn().mockResolvedValue(overrides?.booked ?? []),
  } as unknown as AppointmentRepository;

  return { shiftRepo, appointmentRepo };
}

describe('GetAvailableSlots', () => {
  it('returns empty array for a past date', async () => {
    const { shiftRepo, appointmentRepo } = makeRepos();
    const useCase = new GetAvailableSlots(appointmentRepo, shiftRepo);
    const slots = await useCase.execute('barber-1', '2020-01-01');
    expect(slots).toEqual([]);
  });

  it('returns empty array when barber has no shifts for that day', async () => {
    const { shiftRepo, appointmentRepo } = makeRepos({ shifts: [] });
    const useCase = new GetAvailableSlots(appointmentRepo, shiftRepo);
    const slots = await useCase.execute('barber-1', FUTURE_MONDAY);
    expect(slots).toEqual([]);
  });

  it('generates correct slots from a 09:00–12:00 shift (30-min slots)', async () => {
    const { shiftRepo, appointmentRepo } = makeRepos();
    const useCase = new GetAvailableSlots(appointmentRepo, shiftRepo);
    const slots = await useCase.execute('barber-1', FUTURE_MONDAY);
    expect(slots).toEqual([
      { time: '09:00', available: true },
      { time: '09:30', available: true },
      { time: '10:00', available: true },
      { time: '10:30', available: true },
      { time: '11:00', available: true },
      { time: '11:30', available: true },
    ]);
  });

  it('marks booked slots as unavailable', async () => {
    const { shiftRepo, appointmentRepo } = makeRepos({ booked: ['10:00', '11:00'] });
    const useCase = new GetAvailableSlots(appointmentRepo, shiftRepo);
    const slots = await useCase.execute('barber-1', FUTURE_MONDAY);
    expect(slots.find((s) => s.time === '10:00')).toEqual({ time: '10:00', available: false });
    expect(slots.find((s) => s.time === '11:00')).toEqual({ time: '11:00', available: false });
    expect(slots.find((s) => s.time === '09:00')).toEqual({ time: '09:00', available: true });
  });

  it('returns all slots as unavailable on full-day absence', async () => {
    const { shiftRepo, appointmentRepo } = makeRepos({
      absences: [{ startTime: null, endTime: null }],
    });
    const useCase = new GetAvailableSlots(appointmentRepo, shiftRepo);
    const slots = await useCase.execute('barber-1', FUTURE_MONDAY);
    expect(slots.every((s) => !s.available)).toBe(true);
    expect(slots.length).toBeGreaterThan(0);
  });

  it('marks slots within an absence window as unavailable', async () => {
    const { shiftRepo, appointmentRepo } = makeRepos({
      absences: [{ startTime: '09:00', endTime: '10:30' }],
    });
    const useCase = new GetAvailableSlots(appointmentRepo, shiftRepo);
    const slots = await useCase.execute('barber-1', FUTURE_MONDAY);
    expect(slots.find((s) => s.time === '09:00')).toEqual({ time: '09:00', available: false });
    expect(slots.find((s) => s.time === '09:30')).toEqual({ time: '09:30', available: false });
    expect(slots.find((s) => s.time === '10:30')).toEqual({ time: '10:30', available: true });
    expect(slots.find((s) => s.time === '11:00')).toEqual({ time: '11:00', available: true });
  });

  it('marks slots that overlap an unaligned absence window as unavailable', async () => {
    // Absence starts at 09:15 (not on a 30-min boundary) — slot 09:00–09:30 overlaps it
    const { shiftRepo, appointmentRepo } = makeRepos({
      absences: [{ startTime: '09:15', endTime: '10:30' }],
    });
    const useCase = new GetAvailableSlots(appointmentRepo, shiftRepo);
    const slots = await useCase.execute('barber-1', FUTURE_MONDAY);
    expect(slots.find((s) => s.time === '09:00')).toEqual({ time: '09:00', available: false });
    expect(slots.find((s) => s.time === '09:30')).toEqual({ time: '09:30', available: false });
    expect(slots.find((s) => s.time === '10:30')).toEqual({ time: '10:30', available: true });
  });
});
