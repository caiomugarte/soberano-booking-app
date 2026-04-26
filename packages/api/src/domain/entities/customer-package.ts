export interface CustomerPackageEntity {
  id: string;
  tenantId: string;
  customerName: string;
  customerPhone: string | null;
  totalUses: number;
  usedCount: number;
  totalPriceCents: number;
  status: 'active' | 'completed' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}
