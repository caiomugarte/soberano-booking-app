import type { AppointmentStatus } from '@soberano/shared';

export type CustomerPackageStatus = 'active' | 'completed' | 'cancelled';

export interface CustomerPackageProgressEntity {
  appointmentNumber: number;
  totalUses: number;
  totalPriceCents: number;
}

export interface CustomerPackageLinkedAppointmentEntity {
  id: string;
  providerId: string;
  date: Date;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  priceCents: number;
  service: {
    id: string;
    name: string;
    icon: string;
  };
  customer: {
    id: string;
    name: string;
    phone: string | null;
  };
  packageProgress: CustomerPackageProgressEntity;
}

export interface CustomerPackageEntity {
  id: string;
  tenantId: string;
  providerId: string;
  customerName: string;
  customerPhone: string | null;
  totalUses: number;
  usedCount: number;
  totalPriceCents: number;
  status: CustomerPackageStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomerPackageDetailsEntity extends CustomerPackageEntity {
  linkedAppointments: CustomerPackageLinkedAppointmentEntity[];
}
