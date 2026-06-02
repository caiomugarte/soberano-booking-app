import type {
  NeuromodulationProtocolEntity,
  NeuromodulationProtocolStatus,
  NeuromodulationProtocolUsageSnapshot,
  NeuromodulationProtocolWithCounters,
  ProtocolPaymentMethod,
  ProtocolPaymentStatus,
} from '../entities/neuromodulation-protocol.js';

export interface CreateNeuromodulationProtocolData {
  tenantId: string;
  providerId: string;
  customerId: string;
  totalSessions: number;
  totalPriceCents: number;
  status?: NeuromodulationProtocolStatus;
  paymentStatus?: ProtocolPaymentStatus;
  paymentMethod?: ProtocolPaymentMethod | null;
  paidAt?: Date | null;
  notes?: string | null;
}

export interface UpdateNeuromodulationProtocolData {
  totalSessions?: number;
  totalPriceCents?: number;
  status?: NeuromodulationProtocolStatus;
  paymentStatus?: ProtocolPaymentStatus;
  paymentMethod?: ProtocolPaymentMethod | null;
  paidAt?: Date | null;
  manualConsumedCount?: number;
  notes?: string | null;
}

export interface NeuromodulationProtocolRepository {
  create(data: CreateNeuromodulationProtocolData): Promise<NeuromodulationProtocolEntity>;
  findById(id: string): Promise<NeuromodulationProtocolEntity | null>;
  findWithCountersById(id: string): Promise<NeuromodulationProtocolWithCounters | null>;
  findByCustomerId(customerId: string): Promise<NeuromodulationProtocolWithCounters[]>;
  findCurrentByCustomerId(customerId: string): Promise<NeuromodulationProtocolEntity | null>;
  update(id: string, data: UpdateNeuromodulationProtocolData): Promise<NeuromodulationProtocolEntity>;
  getUsageSnapshot(protocolId: string, excludeAppointmentId?: string): Promise<NeuromodulationProtocolUsageSnapshot>;
  countLinkedAppointments(protocolId: string): Promise<number>;
  deleteById(id: string): Promise<void>;
}
