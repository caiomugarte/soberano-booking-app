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
  isActive: boolean;
}
