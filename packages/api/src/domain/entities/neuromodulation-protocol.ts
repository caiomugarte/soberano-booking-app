export type NeuromodulationProtocolStatus = 'active' | 'maintenance' | 'finished';
export type ProtocolPaymentStatus = 'pending' | 'paid';
export type ProtocolPaymentMethod = 'card' | 'pix' | 'cash';

export interface NeuromodulationProtocolEntity {
  id: string;
  tenantId: string;
  providerId: string;
  customerId: string;
  totalSessions: number;
  status: NeuromodulationProtocolStatus;
  totalPriceCents: number;
  paymentStatus: ProtocolPaymentStatus;
  paymentMethod: ProtocolPaymentMethod | null;
  paidAt: Date | null;
  manualConsumedCount: number;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface NeuromodulationProtocolWithCounters extends NeuromodulationProtocolEntity {
  reservedSessions: number;
  consumedSessions: number;
  remainingSessions: number;
}

export interface NeuromodulationProtocolUsageSnapshot {
  reservedSessions: number;
  consumedSessions: number;
  remainingSessions: number;
}
