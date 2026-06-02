import { describe, expect, it } from 'vitest';
import type { AppointmentRepository } from '../../../../domain/repositories/appointment.repository.js';
import type { RecurringAppointmentSeriesRepository } from '../../../../domain/repositories/recurring-appointment-series.repository.js';
import type { ServiceRepository } from '../../../../domain/repositories/service.repository.js';
import type { AppointmentWithDetails } from '../../../../domain/entities/appointment.js';
import type { RecurringAppointmentSeriesEntity } from '../../../../domain/entities/recurring-appointment-series.js';
import { CreateRecurringSeriesUseCase } from '../create-recurring-series.js';
import { MaterializeRecurringSeriesWindowUseCase } from '../materialize-recurring-series-window.js';
import { StopRecurringSeriesUseCase } from '../stop-recurring-series.js';

const service = {
  id: 'service-1',
  tenantId: 'tenant-1',
  slug: 'individual',
  name: 'Sessao Individual',
  icon: 'S',
  priceCents: 20000,
  duration: 50,
  isActive: true,
  sortOrder: 1,
};

const provider = {
  id: 'provider-1',
  tenantId: 'tenant-1',
  slug: 'bruno',
  firstName: 'Bruno',
  lastName: 'Morghetti',
  email: 'bruno@example.com',
  password: 'hash',
  phone: null,
  avatarUrl: null,
  pixKey: null,
  messageTemplate: null,
  isActive: true,
};

const customer = {
  id: 'customer-1',
  tenantId: 'tenant-1',
  name: 'Paciente',
  phone: '67999999999',
  cpf: null,
  email: null,
  notes: null,
  psychotherapyPriceCents: 20000,
  psychotherapyFrequency: 'weekly' as const,
  neuromodulationEligible: false,
  parentsMeetingStatus: null,
  birthDate: null,
  address: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function appointmentFactory(overrides: Partial<AppointmentWithDetails>): AppointmentWithDetails {
  return {
    id: overrides.id ?? `appointment-${Math.random()}`,
    barberId: provider.id,
    serviceId: service.id,
    customerId: customer.id,
    packageId: null,
    protocolId: null,
    protocolCreditOutcome: null,
    recurringSeriesId: null,
    date: overrides.date ?? new Date('2099-06-15T00:00:00'),
    startTime: overrides.startTime ?? '10:00',
    endTime: overrides.endTime ?? '10:50',
    priceCents: overrides.priceCents ?? service.priceCents,
    status: overrides.status ?? 'scheduled',
    cancelToken: overrides.cancelToken ?? `token-${Math.random()}`,
    reminderSent: false,
    barberReminderSent: false,
    cancelledAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    paymentStatus: 'pending',
    paymentMethod: null,
    paidAt: null,
    appointmentNotes: null,
    barber: provider,
    service,
    customer,
    package: null,
    protocol: null,
    ...overrides,
  };
}

function makeHarness() {
  const appointments: AppointmentWithDetails[] = [];
  const seriesList: RecurringAppointmentSeriesEntity[] = [];

  const appointmentRepo: AppointmentRepository = {
    create: async (data) => {
      const appointment = appointmentFactory({
        id: `appointment-${appointments.length + 1}`,
        barberId: data.barberId,
        serviceId: data.serviceId,
        customerId: data.customerId,
        packageId: data.packageId ?? null,
        recurringSeriesId: data.recurringSeriesId ?? null,
        date: data.date,
        startTime: data.startTime,
        endTime: data.endTime,
        priceCents: data.priceCents,
        status: (data.status as AppointmentWithDetails['status'] | undefined) ?? 'confirmed',
        cancelToken: data.cancelToken,
        paymentStatus: (data.paymentStatus as AppointmentWithDetails['paymentStatus'] | undefined) ?? 'pending',
        paymentMethod: (data.paymentMethod as AppointmentWithDetails['paymentMethod'] | undefined) ?? null,
        paidAt: data.paidAt ?? null,
        appointmentNotes: data.appointmentNotes ?? null,
      });
      appointments.push(appointment);
      return appointment;
    },
    findByCancelToken: async () => null,
    findById: async () => null,
    findBookedSlots: async () => [],
    findByBarberAndDate: async () => ({ appointments: [], total: 0, summary: { confirmed: 0, completed: 0, revenueCents: 0 } }),
    findUpcomingWithoutReminder: async () => [],
    updateStatus: async () => undefined,
    updateDateTime: async () => appointmentFactory({}),
    markReminderSent: async () => undefined,
    findUpcomingWithoutBarberReminder: async () => [],
    markBarberReminderSent: async () => undefined,
    getStatsByDateRange: async () => [],
    findByBarberAndDateRange: async (barberId, from, to) =>
      appointments.filter(
        (appointment) =>
          appointment.barberId === barberId &&
          appointment.date >= from &&
          appointment.date <= to,
      ),
    findByRecurringSeriesId: async (recurringSeriesId, from, to) =>
      appointments.filter(
        (appointment) =>
          appointment.recurringSeriesId === recurringSeriesId &&
          appointment.date >= from &&
          (!to || appointment.date <= to),
      ),
    findUpcomingByCustomerPhone: async () => null,
    deleteFutureByRecurringSeriesId: async (recurringSeriesId, from) => {
      const before = appointments.length;
      const remaining = appointments.filter(
        (appointment) =>
          appointment.recurringSeriesId !== recurringSeriesId || appointment.date < from,
      );
      appointments.splice(0, appointments.length, ...remaining);
      return before - appointments.length;
    },
    deleteById: async () => undefined,
    updateCustomer: async () => undefined,
    updatePaymentStatus: async () => appointmentFactory({}),
    getFinancialSummary: async () => ({
      totalSessions: 0,
      paidCount: 0,
      pendingCount: 0,
      revenueCents: 0,
      appointments: [],
      protocolSales: [],
    }),
    findPatientHistory: async () => [],
    getPatientFinancialSummary: async () => ({
      sessionReceivables: {
        totalCount: 0,
        paidCount: 0,
        pendingCount: 0,
        paidTotalCents: 0,
        pendingTotalCents: 0,
      },
      protocolSales: {
        totalCount: 0,
        paidCount: 0,
        pendingCount: 0,
        paidTotalCents: 0,
        pendingTotalCents: 0,
      },
    }),
    updateDetails: async () => appointmentFactory({}),
    updateSchedule: async () => appointmentFactory({}),
  };

  const recurringSeriesRepo: RecurringAppointmentSeriesRepository = {
    create: async (data) => {
      const series: RecurringAppointmentSeriesEntity = {
        id: `series-${seriesList.length + 1}`,
        tenantId: data.tenantId,
        providerId: data.providerId,
        customerId: data.customerId,
        serviceId: data.serviceId,
        startDate: data.startDate,
        startTime: data.startTime,
        endTime: data.endTime,
        intervalWeeks: data.intervalWeeks,
        status: 'active',
        stopDate: null,
        priceCents: data.priceCents ?? null,
        notes: data.notes ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      seriesList.push(series);
      return series;
    },
    findById: async (id) => seriesList.find((series) => series.id === id) ?? null,
    findActive: async () => seriesList.filter((series) => series.status === 'active'),
    stop: async (id, stopDate) => {
      const series = seriesList.find((item) => item.id === id);
      if (!series) {
        throw new Error('Series not found');
      }
      series.status = 'stopped';
      series.stopDate = stopDate;
      series.updatedAt = new Date();
      return series;
    },
  };

  const serviceRepo: ServiceRepository = {
    findAllActive: async () => [service],
    findById: async () => service,
    findBySlug: async () => service,
  };

  return {
    appointments,
    seriesList,
    createUseCase: new CreateRecurringSeriesUseCase(appointmentRepo, recurringSeriesRepo, serviceRepo),
    materializeUseCase: new MaterializeRecurringSeriesWindowUseCase(appointmentRepo, recurringSeriesRepo),
    stopUseCase: new StopRecurringSeriesUseCase(appointmentRepo, recurringSeriesRepo),
    recurringSeriesRepo,
  };
}

describe('Recurring session series use cases', () => {
  it('creates a weekly series and seeds the protected horizon', async () => {
    const harness = makeHarness();

    const result = await harness.createUseCase.execute({
      tenantId: 'tenant-1',
      providerId: provider.id,
      customerId: customer.id,
      serviceId: service.id,
      startDate: '2099-06-15',
      startTime: '10:00',
      intervalWeeks: 1,
      notes: 'Sessao recorrente',
    });

    expect(result.series.intervalWeeks).toBe(1);
    expect(result.cadenceLabel).toBe('toda semana');
    expect(result.createdAppointments).toBe(harness.appointments.length);
    expect(harness.appointments[0]?.date.toISOString().slice(0, 10)).toBe('2099-06-15');
    expect(harness.appointments[1]?.date.toISOString().slice(0, 10)).toBe('2099-06-22');
    expect(harness.appointments.every((appointment) => appointment.recurringSeriesId === result.series.id)).toBe(true);
  });

  it('materializes missing biweekly occurrences without duplicating existing ones', async () => {
    const harness = makeHarness();

    const series = await harness.recurringSeriesRepo.create({
      tenantId: 'tenant-1',
      providerId: provider.id,
      customerId: customer.id,
      serviceId: service.id,
      startDate: new Date('2099-06-15T00:00:00'),
      startTime: '10:00',
      endTime: '10:50',
      intervalWeeks: 2,
      priceCents: service.priceCents,
      notes: null,
    });

    harness.appointments.push(
      appointmentFactory({
        id: 'existing-occurrence',
        recurringSeriesId: series.id,
        date: new Date('2099-06-15T00:00:00'),
        startTime: '10:00',
        endTime: '10:50',
      }),
    );

    const result = await harness.materializeUseCase.execute({
      seriesId: series.id,
      horizonDays: 42,
    });

    const materializedDates = harness.appointments
      .filter((appointment) => appointment.recurringSeriesId === series.id)
      .map((appointment) => appointment.date.toISOString().slice(0, 10));

    expect(result.processedSeries).toBe(1);
    expect(result.conflicts).toEqual([]);
    expect(materializedDates).toEqual([
      '2099-06-15',
      '2099-06-29',
      '2099-07-13',
      '2099-07-27',
    ]);
  });

  it('rejects recurring creation when a protected-horizon occurrence is already occupied', async () => {
    const harness = makeHarness();

    harness.appointments.push(
      appointmentFactory({
        id: 'conflict',
        date: new Date('2099-06-29T00:00:00'),
        startTime: '10:00',
        endTime: '10:50',
        status: 'scheduled',
      }),
    );

    await expect(
      harness.createUseCase.execute({
        tenantId: 'tenant-1',
        providerId: provider.id,
        customerId: customer.id,
        serviceId: service.id,
        startDate: '2099-06-15',
        startTime: '10:00',
        intervalWeeks: 2,
      }),
    ).rejects.toMatchObject({
      statusCode: 409,
      code: 'RECURRING_SERIES_CONFLICT',
    });
  });

  it('stops a series and removes future occurrences from the stop date onward', async () => {
    const harness = makeHarness();

    const created = await harness.createUseCase.execute({
      tenantId: 'tenant-1',
      providerId: provider.id,
      customerId: customer.id,
      serviceId: service.id,
      startDate: '2099-06-15',
      startTime: '10:00',
      intervalWeeks: 1,
    });

    const result = await harness.stopUseCase.execute({
      seriesId: created.series.id,
      providerId: provider.id,
      stopDate: '2099-06-29',
    });

    const remainingDates = harness.appointments.map((appointment) =>
      appointment.date.toISOString().slice(0, 10),
    );

    expect(result.series.status).toBe('stopped');
    expect(result.removedAppointments).toBeGreaterThan(0);
    expect(remainingDates).toEqual(['2099-06-15', '2099-06-22']);
  });
});
