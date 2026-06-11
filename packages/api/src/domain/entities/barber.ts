export interface BarberEntity {
  id: string;
  tenantId: string;
  slug: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone: string | null;
  avatarUrl: string | null;
  pixKey: string | null;
  messageTemplate: string | null;
  workspaceStartTime: string;
  workspaceEndTime: string;
  defaultSessionDurationMinutes: number;
  isActive: boolean;
}
