import crypto from 'node:crypto';
import type { AppointmentRepository } from '../../../domain/repositories/appointment.repository.js';
import type { ServiceRepository } from '../../../domain/repositories/service.repository.js';
import type { BarberRepository } from '../../../domain/repositories/barber.repository.js';
import type { CustomerRepository } from '../../../domain/repositories/customer.repository.js';
import type { BarberShiftRepository } from '../../../domain/repositories/barber-shift.repository.js';
import type { AppointmentWithDetails } from '../../../domain/entities/appointment.js';
import { NotFoundError, SlotTakenError, ValidationError } from '../../../shared/errors.js';
import type { WhatsAppNotificationService } from '../../../infrastructure/notifications/whatsapp-notification.service.js';

interface CreateAppointmentInput {
  clientId: string;
  serviceId: string;
  barberId: string;
  date: string;
  startTime: string;
  customerName: string;
  customerPhone: string;
}

export class CreateAppointment {
  constructor(
    private appointmentRepo: AppointmentRepository,
    private serviceRepo: ServiceRepository,
    private barberRepo: BarberRepository,
    private customerRepo: CustomerRepository,
    private notificationService: WhatsAppNotificationService,
    private shiftRepo: BarberShiftRepository,
  ) {}

  async execute(input: CreateAppointmentInput): Promise<{ appointment: AppointmentWithDetails }> {
    const { clientId } = input;

    // Validate service
    const service = await this.serviceRepo.findById(input.serviceId, clientId);
    if (!service || !service.isActive) {
      throw new NotFoundError('Serviço');
    }

    // Validate barber
    const barber = await this.barberRepo.findById(input.barberId, clientId);
    if (!barber || !barber.isActive) {
      throw new NotFoundError('Barbeiro');
    }

    // Validate date
    const date = new Date(input.date + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (date < today) {
      throw new ValidationError('Não é possível agendar em uma data passada.');
    }

    // Validate that barber has a shift covering the requested slot
    const shifts = await this.shiftRepo.findByBarberAndDay(input.barberId, date.getDay());
    if (!shifts.length) {
      throw new ValidationError('Barbeiro não atende neste dia da semana.');
    }
    const slotCovered = shifts.some(
      (s) => input.startTime >= s.startTime && input.startTime < s.endTime,
    );
    if (!slotCovered) {
      throw new ValidationError('Horário fora do expediente do barbeiro.');
    }

    // Calculate end time
    const [h, m] = input.startTime.split(':').map(Number);
    const endMinutes = h * 60 + m + service.duration;
    const endTime = `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`;

    // Upsert customer
    const customer = await this.customerRepo.upsertByPhone(input.customerPhone, input.customerName, clientId);

    // Generate cancel token
    const cancelToken = crypto.randomBytes(32).toString('hex');

    // Create appointment (PG unique constraint prevents double-booking)
    let appointment: AppointmentWithDetails;
    try {
      appointment = await this.appointmentRepo.create({
        barberId: input.barberId,
        serviceId: input.serviceId,
        customerId: customer.id,
        clientId,
        date,
        startTime: input.startTime,
        endTime,
        priceCents: service.priceCents,
        cancelToken,
      });
    } catch (error: unknown) {
      // Prisma unique constraint violation
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
        throw new SlotTakenError();
      }
      throw error;
    }

    // Send WhatsApp notification (fire-and-forget)
    this.notificationService.sendBookingConfirmation(appointment).catch((err) => {
      console.error('[Notification] Failed to send booking confirmation:', err);
    });

    this.notificationService.notifyBarber(appointment, 'booked').catch((err) => {
      console.error('[Notification] Failed to notify barber:', err);
    });

    return { appointment };
  }
}
