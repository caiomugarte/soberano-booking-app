export interface SessionReportEntity {
  id: string;
  tenantId: string;
  appointmentId: string;
  providerId: string;
  content: string;
  fileName: string | null;
  fileType: string | null;
  fileData: string | null;
  createdAt: Date;
  updatedAt: Date;
}
