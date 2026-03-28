import type { AppointmentRepository } from '../../../domain/repositories/appointment.repository.js';
import type { BarberShiftRepository } from '../../../domain/repositories/barber-shift.repository.js';

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function generateSlotsForShift(startTime: string, endTime: string, durationMinutes = 30): string[] {
  const slots: string[] = [];
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  for (let m = start; m + durationMinutes <= end; m += durationMinutes) {
    slots.push(minutesToTime(m));
  }
  return slots;
}

export class GetAvailableSlots {
  constructor(
    private appointmentRepo: AppointmentRepository,
    private shiftRepo: BarberShiftRepository,
  ) {}

  async execute(barberId: string, dateStr: string): Promise<string[]> {
    const date = new Date(dateStr + 'T00:00:00');
    const dayOfWeek = date.getDay();

    // Check if date is in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) return [];

    // Get barber's shifts for this day
    const shifts = await this.shiftRepo.findByBarberAndDay(barberId, dayOfWeek);
    if (!shifts.length) return []; // barber doesn't work this day

    // Generate all possible slots from each shift window
    const allSlots = shifts.flatMap((s) => generateSlotsForShift(s.startTime, s.endTime));

    // Get booked slots
    const bookedSlots = await this.appointmentRepo.findBookedSlots(barberId, date);
    const bookedSet = new Set(bookedSlots);

    // Get absences for this date
    const absences = await this.shiftRepo.findAbsencesByBarberAndDate(barberId, date);

    // Full day absence → no slots
    const fullDayAbsence = absences.some((a) => !a.startTime && !a.endTime);
    if (fullDayAbsence) return [];

    // Build set of absent time slots
    const absentSlots = new Set<string>();
    for (const absence of absences) {
      if (absence.startTime && absence.endTime) {
        const absentInWindow = generateSlotsForShift(absence.startTime, absence.endTime);
        absentInWindow.forEach((s) => absentSlots.add(s));
      }
    }

    let available = allSlots.filter((slot) => !bookedSet.has(slot) && !absentSlots.has(slot));

    // If today, filter out past slots
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      available = available.filter((slot) => timeToMinutes(slot) > currentMinutes);
    }

    return available;
  }
}
