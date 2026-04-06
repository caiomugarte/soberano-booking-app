import type { ServiceEntity } from '../entities/service.js';

export interface ServiceRepository {
  findAllActive(clientId: string): Promise<ServiceEntity[]>;
  findById(id: string, clientId: string): Promise<ServiceEntity | null>;
}
