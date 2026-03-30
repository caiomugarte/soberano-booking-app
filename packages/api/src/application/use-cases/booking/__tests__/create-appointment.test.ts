import { describe, it, expect, vi } from 'vitest';
import { CreateAppointment } from '../create-appointment.js';
import { NotFoundError, SlotTakenError, ValidationError } from '../../../../shared/errors.js';
import type { AppointmentRepository } from '../../../../domain/repositories/appointment.repository.js';
import type { ServiceRepository } from '../../../../domain/repositories/service.repository.js';
import type { BarberRepository } from '../../../../domain/repositories/barber.repository.js';
import type { CustomerRepository } from '../../../../domain/repositories/customer.repository.js';
import type { BarberShiftRepository } from '../../../../domain/repositories/barber-shift.repository.js';
import type { WhatsAppNotificationService } from '../../../../infrastructure/notifications/whatsapp-notification.service.js';

const FUTURE_TUESDAY = '2026-06-16'; // Tuesday — a work day

const activeService = {
  id: 'svc-1', slug: 'corte', name: 'Corte', icon: '✂️',
  priceCents: 3500, duration: 30, isActive: true, sortOrder: 1,
};

const activeBarber = {
  id: 'barber-1', slug: 'joao', firstName: 'João', lastName: 'Silva',
  email: 'joao@s.com', password: 'hash', phone: null, avatarUrl: null, isActive: true,
};

const customer = { id: 'cust-1', name: 'Maria', phone: '11999998888' };

const appointmentResult = {
  id: 'appt-1',
  barberId: 'barber-1',
  serviceId: 'svc-1',
  customerId: 'cust-1',
  date: new Date(FUTURE_TUESDAY),
  startTime: '10:00',
  endTime: '10:30',
  priceCents: 3500,
  status: 'confirmed',
  cancelToken: 'abc123',
  reminderSent: false,
  cancelledAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  barber: activeBarber,
  service: activeService,
  customer,
};

function makeUseCase(overrides?: {
  service?: unknown;
  barber?: unknown;
  appointmentCreate?: () => unknown;
}) {
  const serviceRepo = {
    findById: vi.fn().mockResolvedValue(overrides?.service !== undefined ? overrides.service : activeService),
    findAllActive: vi.fn(),
  } as unknown as ServiceRepository;

  const barberRepo = {
    findById: vi.fn().mockResolvedValue(overrides?.barber !== undefined ? overrides.barber : activeBarber),
    findAllActive: vi.fn(),
    findByEmail: vi.fn(),
  } as unknown as BarberRepository;

  const customerRepo = {
    upsertByPhone: vi.fn().mockResolvedValue(customer),
    findByPhone: vi.fn(),
  } as unknown as CustomerRepository;

  const appointmentRepo = {
    create: vi.fn().mockImplementation(overrides?.appointmentCreate ?? (() => Promise.resolve(appointmentResult))),
  } as unknown as AppointmentRepository;

  const notificationService = {
    sendBookingConfirmation: vi.fn().mockResolvedValue(undefined),
    notifyBarber: vi.fn().mockResolvedValue(undefined),
  } as unknown as WhatsAppNotificationService;

  const shiftRepo = {
    findByBarberAndDay: vi.fn().mockImplementation((_, day: number) =>
      // Simulate Mon–Sat (1–6) with a full-day shift; Sun (0) has no shifts
      Promise.resolve(day === 0 ? [] : [{ id: 's1', barberId: 'barber-1', dayOfWeek: day, startTime: '09:00', endTime: '18:30' }])
    ),
  } as unknown as BarberShiftRepository;

  return new CreateAppointment(appointmentRepo, serviceRepo, barberRepo, customerRepo, notificationService, shiftRepo);
}

const validInput = {
  serviceId: 'svc-1',
  barberId: 'barber-1',
  date: FUTURE_TUESDAY,
  startTime: '10:00',
  customerName: 'Maria',
  customerPhone: '11999998888',
};

describe('CreateAppointment', () => {
  it('throws NotFoundError when service does not exist', async () => {
    const useCase = makeUseCase({ service: null });
    await expect(useCase.execute(validInput)).rejects.toBeInstanceOf(NotFoundError);
  });

  it('throws NotFoundError when service is inactive', async () => {
    const useCase = makeUseCase({ service: { ...activeService, isActive: false } });
    await expect(useCase.execute(validInput)).rejects.toBeInstanceOf(NotFoundError);
  });

  it('throws NotFoundError when barber does not exist', async () => {
    const useCase = makeUseCase({ barber: null });
    await expect(useCase.execute(validInput)).rejects.toBeInstanceOf(NotFoundError);
  });

  it('throws NotFoundError when barber is inactive', async () => {
    const useCase = makeUseCase({ barber: { ...activeBarber, isActive: false } });
    await expect(useCase.execute(validInput)).rejects.toBeInstanceOf(NotFoundError);
  });

  it('throws ValidationError for a past date', async () => {
    const useCase = makeUseCase();
    await expect(useCase.execute({ ...validInput, date: '2020-01-01' })).rejects.toBeInstanceOf(ValidationError);
  });

  it('throws ValidationError for a Sunday (non-work day)', async () => {
    const useCase = makeUseCase();
    // 2026-06-21 is a Sunday
    await expect(useCase.execute({ ...validInput, date: '2026-06-21' })).rejects.toBeInstanceOf(ValidationError);
  });

  it('throws ValidationError for a time before opening', async () => {
    const useCase = makeUseCase();
    await expect(useCase.execute({ ...validInput, startTime: '08:00' })).rejects.toBeInstanceOf(ValidationError);
  });

  it('throws ValidationError for a time at or after closing', async () => {
    const useCase = makeUseCase();
    await expect(useCase.execute({ ...validInput, startTime: '18:30' })).rejects.toBeInstanceOf(ValidationError);
  });

  it('creates appointment and returns cancelUrl on happy path', async () => {
    const useCase = makeUseCase();
    const result = await useCase.execute(validInput);
    expect(result.appointment.id).toBe('appt-1');
    expect(result.cancelUrl).toContain('/agendamento/');
  });

  it('throws SlotTakenError when Prisma unique constraint fires (P2002)', async () => {
    const useCase = makeUseCase({
      appointmentCreate: () => { throw Object.assign(new Error('Unique constraint'), { code: 'P2002' }); },
    });
    await expect(useCase.execute(validInput)).rejects.toBeInstanceOf(SlotTakenError);
  });
});
