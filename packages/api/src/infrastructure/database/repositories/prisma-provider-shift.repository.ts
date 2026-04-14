// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PrismaClientOrExtended = any;
import type {
  ProviderShiftRepository,
  ProviderShiftEntity,
  ProviderAbsenceEntity,
} from '../../../domain/repositories/provider-shift.repository.js';


export class PrismaProviderShiftRepository implements ProviderShiftRepository {
  constructor(private db: PrismaClientOrExtended) {}

  async findByProviderAndDay(providerId: string, dayOfWeek: number): Promise<ProviderShiftEntity[]> {
    return this.db.providerShift.findMany({
      where: { providerId, dayOfWeek },
      orderBy: { startTime: 'asc' },
    });
  }

  async findAllByProvider(providerId: string): Promise<ProviderShiftEntity[]> {
    return this.db.providerShift.findMany({
      where: { providerId },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
  }

  async replaceForProvider(
    providerId: string,
    shifts: Omit<ProviderShiftEntity, 'id' | 'providerId'>[],
  ): Promise<void> {
    await this.db.$transaction([
      this.db.providerShift.deleteMany({ where: { providerId } }),
      this.db.providerShift.createMany({
        data: shifts.map((s) => ({ ...s, providerId })),
      }),
    ]);
  }

  async findAbsencesByProviderAndDate(providerId: string, date: Date): Promise<ProviderAbsenceEntity[]> {
    return this.db.providerAbsence.findMany({
      where: { providerId, date },
    }) as unknown as ProviderAbsenceEntity[];
  }

  async findAbsencesByProvider(providerId: string): Promise<ProviderAbsenceEntity[]> {
    return this.db.providerAbsence.findMany({
      where: { providerId },
      orderBy: { date: 'asc' },
    }) as unknown as ProviderAbsenceEntity[];
  }

  async createAbsence(data: Omit<ProviderAbsenceEntity, 'id'>): Promise<ProviderAbsenceEntity> {
    return this.db.providerAbsence.create({ data }) as unknown as ProviderAbsenceEntity;
  }

  async updateAbsence(
    id: string,
    data: Partial<Pick<ProviderAbsenceEntity, 'date' | 'startTime' | 'endTime' | 'reason'>>,
  ): Promise<ProviderAbsenceEntity> {
    return this.db.providerAbsence.update({ where: { id }, data }) as unknown as ProviderAbsenceEntity;
  }

  async deleteAbsence(id: string): Promise<void> {
    await this.db.providerAbsence.delete({ where: { id } });
  }
}
