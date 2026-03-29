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
    expect(slots).toEqual(['09:00', '09:30', '10:00', '10:30', '11:00', '11:30']);
  });

  it('excludes booked slots', async () => {
    const { shiftRepo, appointmentRepo } = makeRepos({ booked: ['10:00', '11:00'] });
    const useCase = new GetAvailableSlots(appointmentRepo, shiftRepo);
    const slots = await useCase.execute('barber-1', FUTURE_MONDAY);
    expect(slots).not.toContain('10:00');
    expect(slots).not.toContain('11:00');
    expect(slots).toContain('09:00');
  });

  it('returns empty array on full-day absence (no startTime/endTime)', async () => {
    const { shiftRepo, appointmentRepo } = makeRepos({
      absences: [{ startTime: null, endTime: null }],
    });
    const useCase = new GetAvailableSlots(appointmentRepo, shiftRepo);
    const slots = await useCase.execute('barber-1', FUTURE_MONDAY);
    expect(slots).toEqual([]);
  });

  it('excludes slots within an absence window', async () => {
    const { shiftRepo, appointmentRepo } = makeRepos({
      absences: [{ startTime: '09:00', endTime: '10:30' }],
    });
    const useCase = new GetAvailableSlots(appointmentRepo, shiftRepo);
    const slots = await useCase.execute('barber-1', FUTURE_MONDAY);
    expect(slots).not.toContain('09:00');
    expect(slots).not.toContain('09:30');
    expect(slots).toContain('10:30');
    expect(slots).toContain('11:00');
  });
});
