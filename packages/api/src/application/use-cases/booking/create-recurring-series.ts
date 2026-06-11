import crypto from 'node:crypto';
import type { AppointmentRepository } from '../../../domain/repositories/appointment.repository.js';
import type { ProviderRepository } from '../../../domain/repositories/provider.repository.js';
import type { RecurringAppointmentSeriesRepository } from '../../../domain/repositories/recurring-appointment-series.repository.js';
import type { ServiceRepository } from '../../../domain/repositories/service.repository.js';
import type { RecurringAppointmentSeriesEntity } from '../../../domain/entities/recurring-appointment-series.js';
import { AppError, NotFoundError, ValidationError } from '../../../shared/errors.js';
import {
  addMinutes,
  buildOccurrenceDates,
  describeCadence,
  endOfHorizon,
  formatDateKey,
  hasConflictingAppointment,
  parseDateOnly,
  startOfToday,
} from './recurring-series.utils.js';

export interface CreateRecurringSeriesInput {
  tenantId: string;
  providerId: string;
  customerId: string;
  serviceId: string;
  startDate: string;
  startTime: string;
  intervalWeeks: number;
  durationMinutes?: number;
  priceCents?: number;
  notes?: string;
}

export interface CreateRecurringSeriesResult {
  series: RecurringAppointmentSeriesEntity;
  createdAppointments: number;
  cadenceLabel: string;
  protectedUntil: string;
}

export class CreateRecurringSeriesUseCase {
  constructor(
    private readonly appointmentRepo: AppointmentRepository,
    private readonly recurringSeriesRepo: RecurringAppointmentSeriesRepository,
    private readonly serviceRepo: ServiceRepository,
    private readonly providerRepo: ProviderRepository,
  ) {}

  async execute(input: CreateRecurringSeriesInput): Promise<CreateRecurringSeriesResult> {
    if (input.intervalWeeks < 1) {
      throw new ValidationError('O intervalo da recorrência deve ser de pelo menos 1 semana.');
    }

    const [service, provider] = await Promise.all([
      this.serviceRepo.findById(input.serviceId),
      this.providerRepo.findById(input.providerId),
    ]);
    if (!service || !service.isActive) {
      throw new NotFoundError('Serviço');
    }
    if (!provider) {
      throw new NotFoundError('Profissional');
    }

    const seriesStartDate = parseDateOnly(input.startDate);
    if (seriesStartDate < startOfToday()) {
      throw new ValidationError('Não é possível iniciar uma recorrência em uma data passada.');
    }

    const endTime = addMinutes(
      input.startTime,
      input.durationMinutes ?? provider.defaultSessionDurationMinutes,
    );
    const materializationEnd = endOfHorizon(seriesStartDate);
    const candidateDates = buildOccurrenceDates({
      startDate: seriesStartDate,
      intervalWeeks: input.intervalWeeks,
      from: seriesStartDate,
      to: materializationEnd,
    });

    const existingAppointments = await this.appointmentRepo.findByBarberAndDateRange(
      input.providerId,
      seriesStartDate,
      materializationEnd,
    );

    const conflictingDate = candidateDates.find((date) =>
      hasConflictingAppointment(existingAppointments, date, input.startTime, endTime),
    );

    if (conflictingDate) {
      throw new AppError(
        `Já existe uma sessão em ${formatDateKey(conflictingDate)} às ${input.startTime}. Ajuste a recorrência antes de salvar.`,
        409,
        'RECURRING_SERIES_CONFLICT',
      );
    }

    const series = await this.recurringSeriesRepo.create({
      tenantId: input.tenantId,
      providerId: input.providerId,
      customerId: input.customerId,
      serviceId: input.serviceId,
      startDate: seriesStartDate,
      startTime: input.startTime,
      endTime,
      intervalWeeks: input.intervalWeeks,
      priceCents: input.priceCents ?? service.priceCents,
      notes: input.notes ?? null,
    });

    for (const date of candidateDates) {
      await this.appointmentRepo.create({
        tenantId: input.tenantId,
        barberId: input.providerId,
        serviceId: input.serviceId,
        customerId: input.customerId,
        recurringSeriesId: series.id,
        date,
        startTime: input.startTime,
        endTime,
        priceCents: input.priceCents ?? service.priceCents,
        cancelToken: crypto.randomBytes(32).toString('hex'),
        status: 'scheduled',
        paymentStatus: 'pending',
        appointmentNotes: input.notes ?? null,
      });
    }

    return {
      series,
      createdAppointments: candidateDates.length,
      cadenceLabel: describeCadence(input.intervalWeeks),
      protectedUntil: formatDateKey(materializationEnd),
    };
  }
}
