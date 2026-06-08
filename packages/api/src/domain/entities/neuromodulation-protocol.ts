export type NeuromodulationProtocolStatus = 'active' | 'maintenance' | 'finished';
export type ProtocolPaymentStatus = 'pending' | 'partial' | 'paid';
export type ProtocolPaymentMethod = 'card' | 'pix' | 'cash';

export interface NeuromodulationProtocolPaymentEntity {
  id: string;
  tenantId: string;
  protocolId: string;
  amountCents: number;
  paymentMethod: ProtocolPaymentMethod;
  paidAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface NeuromodulationProtocolEntity {
  id: string;
  tenantId: string;
  providerId: string;
  customerId: string;
  totalSessions: number;
  status: NeuromodulationProtocolStatus;
  totalPriceCents: number;
  paymentStatus: ProtocolPaymentStatus;
  paidAmountCents: number;
  remainingAmountCents: number;
  lastPaymentAt: Date | null;
  payments: NeuromodulationProtocolPaymentEntity[];
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
