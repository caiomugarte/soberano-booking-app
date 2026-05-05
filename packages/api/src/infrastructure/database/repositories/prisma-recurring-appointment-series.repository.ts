// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PrismaClientOrExtended = any;
import type {
  CreateRecurringAppointmentSeriesData,
  RecurringAppointmentSeriesRepository,
} from '../../../domain/repositories/recurring-appointment-series.repository.js';
import type { RecurringAppointmentSeriesEntity } from '../../../domain/entities/recurring-appointment-series.js';

function mapRecurringSeries(raw: any): RecurringAppointmentSeriesEntity {
  return raw as RecurringAppointmentSeriesEntity;
}

export class PrismaRecurringAppointmentSeriesRepository implements RecurringAppointmentSeriesRepository {
  constructor(private db: PrismaClientOrExtended) {}

  async create(
    data: CreateRecurringAppointmentSeriesData,
  ): Promise<RecurringAppointmentSeriesEntity> {
    const raw = await this.db.recurringAppointmentSeries.create({ data });
    return mapRecurringSeries(raw);
  }

  async findById(id: string): Promise<RecurringAppointmentSeriesEntity | null> {
    const raw = await this.db.recurringAppointmentSeries.findUnique({ where: { id } });
    return raw ? mapRecurringSeries(raw) : null;
  }

  async findActive(): Promise<RecurringAppointmentSeriesEntity[]> {
    const rows = await this.db.recurringAppointmentSeries.findMany({
      where: { status: 'active' },
      orderBy: [{ startDate: 'asc' }, { startTime: 'asc' }],
    });
    return rows.map(mapRecurringSeries);
  }

  async stop(id: string, stopDate: Date): Promise<RecurringAppointmentSeriesEntity> {
    const raw = await this.db.recurringAppointmentSeries.update({
      where: { id },
      data: {
        status: 'stopped',
        stopDate,
      },
    });
    return mapRecurringSeries(raw);
  }
}
