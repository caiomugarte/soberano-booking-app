import type { BarberEntity } from '../entities/barber.js';

export interface BarberRepository {
  findAllActive(clientId: string): Promise<BarberEntity[]>;
  findById(id: string, clientId: string): Promise<BarberEntity | null>;
  findByEmail(email: string, clientId: string): Promise<BarberEntity | null>;
}
