import crypto from 'node:crypto';
import type { AppointmentRepository } from '../../../domain/repositories/appointment.repository.js';
import type { RecurringAppointmentSeriesEntity } from '../../../domain/entities/recurring-appointment-series.js';
import type { RecurringAppointmentSeriesRepository } from '../../../domain/repositories/recurring-appointment-series.repository.js';
import {
  buildOccurrenceDates,
  endOfHorizon,
  formatDateKey,
  getMaterializationStartDate,
  hasConflictingAppointment,
} from './recurring-series.utils.js';

export interface MaterializeRecurringSeriesWindowInput {
  horizonDays?: number;
  seriesId?: string;
}

export interface MaterializeRecurringSeriesWindowResult {
  processedSeries: number;
  createdAppointments: number;
  conflicts: Array<{ seriesId: string; date: string; startTime: string }>;
}

export class MaterializeRecurringSeriesWindowUseCase {
  constructor(
    private readonly appointmentRepo: AppointmentRepository,
    private readonly recurringSeriesRepo: RecurringAppointmentSeriesRepository,
  ) {}

  async execute(
    input: MaterializeRecurringSeriesWindowInput = {},
  ): Promise<MaterializeRecurringSeriesWindowResult> {
    const seriesList = await this.loadSeries(input.seriesId);
    const conflicts: Array<{ seriesId: string; date: string; startTime: string }> = [];
    let createdAppointments = 0;

    for (const series of seriesList) {
      const createdForSeries = await this.materializeSeries(series, input.horizonDays, conflicts);
      createdAppointments += createdForSeries;
    }

    return {
      processedSeries: seriesList.length,
      createdAppointments,
      conflicts,
    };
  }

  private async loadSeries(seriesId?: string): Promise<RecurringAppointmentSeriesEntity[]> {
    if (!seriesId) {
      return this.recurringSeriesRepo.findActive();
    }

    const series = await this.recurringSeriesRepo.findById(seriesId);
    if (!series || series.status !== 'active') {
      return [];
    }

    return [series];
  }

  private async materializeSeries(
    series: RecurringAppointmentSeriesEntity,
    horizonDays: number | undefined,
    conflicts: Array<{ seriesId: string; date: string; startTime: string }>,
  ): Promise<number> {
    const windowStart = getMaterializationStartDate(series);
    const windowEnd = endOfHorizon(windowStart, horizonDays);
    const candidateDates = buildOccurrenceDates({
      startDate: series.startDate,
      intervalWeeks: series.intervalWeeks,
      from: windowStart,
      to: windowEnd,
    });

    if (candidateDates.length === 0) {
      return 0;
    }

    const [existingAppointments, existingSeriesAppointments] = await Promise.all([
      this.appointmentRepo.findByBarberAndDateRange(series.providerId, windowStart, windowEnd),
      this.appointmentRepo.findByRecurringSeriesId(series.id, windowStart, windowEnd),
    ]);

    const existingSeriesKeys = new Set(
      existingSeriesAppointments.map((appointment) => `${formatDateKey(appointment.date)}|${appointment.startTime}`),
    );

    let createdForSeries = 0;

    for (const date of candidateDates) {
      const key = `${formatDateKey(date)}|${series.startTime}`;

      if (existingSeriesKeys.has(key)) {
        continue;
      }

      if (hasConflictingAppointment(existingAppointments, date, series.startTime, series.id)) {
        conflicts.push({
          seriesId: series.id,
          date: formatDateKey(date),
          startTime: series.startTime,
        });
        continue;
      }

      await this.appointmentRepo.create({
        tenantId: series.tenantId,
        barberId: series.providerId,
        serviceId: series.serviceId,
        customerId: series.customerId,
        recurringSeriesId: series.id,
        date,
        startTime: series.startTime,
        endTime: series.endTime,
        priceCents: series.priceCents ?? 0,
        cancelToken: crypto.randomBytes(32).toString('hex'),
        status: 'scheduled',
        paymentStatus: 'pending',
        appointmentNotes: series.notes,
      });

      existingSeriesKeys.add(key);
      createdForSeries++;
    }

    return createdForSeries;
  }
}
