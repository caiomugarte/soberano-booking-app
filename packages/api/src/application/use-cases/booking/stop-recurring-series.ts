import type { AppointmentRepository } from '../../../domain/repositories/appointment.repository.js';
import type { RecurringAppointmentSeriesEntity } from '../../../domain/entities/recurring-appointment-series.js';
import type { RecurringAppointmentSeriesRepository } from '../../../domain/repositories/recurring-appointment-series.repository.js';
import { NotFoundError, ValidationError } from '../../../shared/errors.js';
import { parseDateOnly } from './recurring-series.utils.js';

export interface StopRecurringSeriesInput {
  seriesId: string;
  providerId: string;
  stopDate: string;
}

export interface StopRecurringSeriesResult {
  series: RecurringAppointmentSeriesEntity;
  removedAppointments: number;
}

export class StopRecurringSeriesUseCase {
  constructor(
    private readonly appointmentRepo: AppointmentRepository,
    private readonly recurringSeriesRepo: RecurringAppointmentSeriesRepository,
  ) {}

  async execute(input: StopRecurringSeriesInput): Promise<StopRecurringSeriesResult> {
    const series = await this.recurringSeriesRepo.findById(input.seriesId);
    if (!series) {
      throw new NotFoundError('Série recorrente');
    }

    if (series.providerId !== input.providerId) {
      throw new NotFoundError('Série recorrente');
    }

    if (series.status !== 'active') {
      throw new ValidationError('Esta recorrência já foi encerrada.');
    }

    const stopDate = parseDateOnly(input.stopDate);
    if (stopDate < series.startDate) {
      throw new ValidationError('A data de encerramento não pode ser anterior ao início da recorrência.');
    }

    const stoppedSeries = await this.recurringSeriesRepo.stop(series.id, stopDate);
    const removedAppointments = await this.appointmentRepo.deleteFutureByRecurringSeriesId(
      series.id,
      stopDate,
    );

    return {
      series: stoppedSeries,
      removedAppointments,
    };
  }
}
