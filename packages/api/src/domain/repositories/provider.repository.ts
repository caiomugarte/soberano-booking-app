import type { BarberEntity } from '../entities/barber.js';

export interface ProviderRepository {
  findAllActive(): Promise<BarberEntity[]>;
  findById(id: string): Promise<BarberEntity | null>;
  findByEmail(email: string): Promise<BarberEntity | null>;
}
