import type { ServiceEntity } from '../entities/service.js';

export interface ServiceRepository {
  findAllActive(): Promise<ServiceEntity[]>;
  findById(id: string): Promise<ServiceEntity | null>;
}
