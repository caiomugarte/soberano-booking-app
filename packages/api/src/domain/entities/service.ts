export interface ServiceEntity {
  id: string;
  slug: string;
  name: string;
  icon: string;
  priceCents: number;
  duration: number;
  isActive: boolean;
  sortOrder: number;
}
