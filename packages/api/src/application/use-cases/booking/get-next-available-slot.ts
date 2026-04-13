import type { AppointmentRepository } from '../../../domain/repositories/appointment.repository.js';
import type { ProviderShiftRepository } from '../../../domain/repositories/provider-shift.repository.js';
import { GetAvailableSlots } from './get-available-slots.js';

export class GetNextAvailableSlot {
  constructor(
    private appointmentRepo: AppointmentRepository,
    private shiftRepo: ProviderShiftRepository,
  ) {}

  async execute(
    barberId: string,
    fromDate: string,
    maxDays: number,
  ): Promise<{ date: string | null; slots: string[] }> {
    const allShifts = await this.shiftRepo.findAllByProvider(barberId);
    if (!allShifts.length) return { date: null, slots: [] };

    const workingDays = new Set(allShifts.map((s) => s.dayOfWeek));
    const getSlots = new GetAvailableSlots(this.appointmentRepo, this.shiftRepo);

    const cursor = new Date(fromDate + 'T00:00:00');

    for (let i = 0; i < maxDays; i++) {
      const d = new Date(cursor);
      d.setDate(d.getDate() + i);

      if (!workingDays.has(d.getDay())) continue;

      const dateStr = d.toISOString().split('T')[0];
      const results = await getSlots.execute(barberId, dateStr);
      const available = results.filter((r) => r.available).map((r) => r.time);

      if (available.length > 0) {
        return { date: dateStr, slots: available };
      }
    }

    return { date: null, slots: [] };
  }
}
