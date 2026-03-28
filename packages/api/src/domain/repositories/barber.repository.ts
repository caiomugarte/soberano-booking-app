import type { BarberEntity } from '../entities/barber.js';

export interface BarberRepository {
  findAllActive(): Promise<BarberEntity[]>;
  findById(id: string): Promise<BarberEntity | null>;
  findByEmail(email: string): Promise<BarberEntity | null>;
}
