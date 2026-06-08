import type {
  NeuromodulationProtocolEntity,
  NeuromodulationProtocolPaymentEntity,
  NeuromodulationProtocolStatus,
  NeuromodulationProtocolUsageSnapshot,
  NeuromodulationProtocolWithCounters,
  ProtocolPaymentMethod,
} from '../entities/neuromodulation-protocol.js';

export interface ProtocolPaymentEntryData {
  amountCents: number;
  paymentMethod: ProtocolPaymentMethod;
  paidAt: Date;
}

export interface CreateNeuromodulationProtocolData {
  tenantId: string;
  providerId: string;
  customerId: string;
  totalSessions: number;
  totalPriceCents: number;
  status?: NeuromodulationProtocolStatus;
  initialPayment?: ProtocolPaymentEntryData;
  notes?: string | null;
}

export interface UpdateNeuromodulationProtocolData {
  totalSessions?: number;
  totalPriceCents?: number;
  status?: NeuromodulationProtocolStatus;
  manualConsumedCount?: number;
  notes?: string | null;
}

export interface NeuromodulationProtocolRepository {
  create(data: CreateNeuromodulationProtocolData): Promise<NeuromodulationProtocolEntity>;
  addPayment(protocolId: string, tenantId: string, data: ProtocolPaymentEntryData): Promise<NeuromodulationProtocolPaymentEntity>;
  updatePayment(paymentId: string, data: ProtocolPaymentEntryData): Promise<NeuromodulationProtocolPaymentEntity>;
  findById(id: string): Promise<NeuromodulationProtocolEntity | null>;
  findWithCountersById(id: string): Promise<NeuromodulationProtocolWithCounters | null>;
  findByCustomerId(customerId: string): Promise<NeuromodulationProtocolWithCounters[]>;
  findCurrentByCustomerId(customerId: string): Promise<NeuromodulationProtocolEntity | null>;
  update(id: string, data: UpdateNeuromodulationProtocolData): Promise<NeuromodulationProtocolEntity>;
  getUsageSnapshot(protocolId: string, excludeAppointmentId?: string): Promise<NeuromodulationProtocolUsageSnapshot>;
  countLinkedAppointments(protocolId: string): Promise<number>;
  deleteById(id: string): Promise<void>;
}
