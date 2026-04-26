import type { SessionReportEntity } from '../entities/session-report.js';

export interface CreateSessionReportData {
  tenantId: string;
  appointmentId: string;
  providerId: string;
  content: string;
  fileName?: string | null;
  fileType?: string | null;
  fileData?: string | null;
}

export interface SessionReportRepository {
  create(data: CreateSessionReportData): Promise<SessionReportEntity>;
  findByAppointment(appointmentId: string): Promise<SessionReportEntity[]>;
  findById(id: string): Promise<SessionReportEntity | null>;
  deleteById(id: string): Promise<void>;
  findByPatient(patientId: string): Promise<SessionReportEntity[]>;
  updateById(id: string, partial: { content?: string; fileName?: string | null; fileType?: string | null; fileData?: string | null }): Promise<SessionReportEntity>;
}
