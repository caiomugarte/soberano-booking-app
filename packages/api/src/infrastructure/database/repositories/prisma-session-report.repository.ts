// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PrismaClientOrExtended = any;
import type { SessionReportEntity } from '../../../domain/entities/session-report.js';
import type {
  CreateSessionReportData,
  SessionReportRepository,
} from '../../../domain/repositories/session-report.repository.js';

export class PrismaSessionReportRepository implements SessionReportRepository {
  constructor(private db: PrismaClientOrExtended) {}

  async create(data: CreateSessionReportData): Promise<SessionReportEntity> {
    return this.db.sessionReport.create({ data });
  }

  async findByAppointment(appointmentId: string): Promise<SessionReportEntity[]> {
    return this.db.sessionReport.findMany({
      where: { appointmentId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string): Promise<SessionReportEntity | null> {
    return this.db.sessionReport.findUnique({ where: { id } });
  }

  async deleteById(id: string): Promise<void> {
    await this.db.sessionReport.delete({ where: { id } });
  }

  async findByPatient(patientId: string): Promise<SessionReportEntity[]> {
    return this.db.sessionReport.findMany({
      where: { appointment: { customerId: patientId } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateById(id: string, partial: { content?: string; fileName?: string | null; fileType?: string | null; fileData?: string | null }): Promise<SessionReportEntity> {
    return this.db.sessionReport.update({ where: { id }, data: partial });
  }
}
