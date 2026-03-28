export interface BarberEntity {
  id: string;
  slug: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  avatarUrl: string | null;
  isActive: boolean;
}
