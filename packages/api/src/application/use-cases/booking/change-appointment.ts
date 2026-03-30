import crypto from 'node:crypto';
import { APPOINTMENT_STATUS } from '@soberano/shared';
import type { AppointmentRepository } from '../../../domain/repositories/appointment.repository.js';
import type { BarberShiftRepository } from '../../../domain/repositories/barber-shift.repository.js';
import type { AppointmentWithDetails } from '../../../domain/entities/appointment.js';
import { NotFoundError, SlotTakenError, ValidationError } from '../../../shared/errors.js';
import { WhatsAppNotificationService } from '../../../infrastructure/notifications/whatsapp-notification.service.js';

export class ChangeAppointment {
  constructor(
    private appointmentRepo: AppointmentRepository,
    private notificationService: WhatsAppNotificationService,
    private shiftRepo: BarberShiftRepository,
  ) {}

  async execute(
    cancelToken: string,
    phoneLastFour: string,
    newDate: string,
    newStartTime: string,
  ): Promise<AppointmentWithDetails> {
    const appointment = await this.appointmentRepo.findByCancelToken(cancelToken);
    if (!appointment) {
      throw new NotFoundError('Agendamento');
    }

    if (!appointment.customer.phone.endsWith(phoneLastFour)) {
      throw new ValidationError('Telefone não confere.');
    }

    if (appointment.status !== APPOINTMENT_STATUS.CONFIRMED) {
      throw new ValidationError('Este agendamento não pode ser alterado.');
    }

    // Validate new date
    const date = new Date(newDate + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (date < today) {
      throw new ValidationError('Não é possível agendar em uma data passada.');
    }

    // Validate that barber has a shift covering the requested slot
    const shifts = await this.shiftRepo.findByBarberAndDay(appointment.barberId, date.getDay());
    if (!shifts.length) {
      throw new ValidationError('Barbeiro não atende neste dia da semana.');
    }
    const slotCovered = shifts.some(
      (s) => newStartTime >= s.startTime && newStartTime < s.endTime,
    );
    if (!slotCovered) {
      throw new ValidationError('Horário fora do expediente do barbeiro.');
    }

    // Calculate new end time using original service duration
    const [h, m] = newStartTime.split(':').map(Number);
    const duration = appointment.service.duration;
    const endMinutes = h * 60 + m + duration;
    const endTime = `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`;

    // Generate new cancel token
    const newCancelToken = crypto.randomBytes(32).toString('hex');

    let updated: AppointmentWithDetails;
    try {
      updated = await this.appointmentRepo.updateDateTime(
        appointment.id,
        date,
        newStartTime,
        endTime,
        newCancelToken,
      );
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
        throw new SlotTakenError();
      }
      throw error;
    }

    // Notify
    this.notificationService.sendChangeNotice(updated).catch((err) => {
      console.error('[Notification] Failed to send change notice:', err);
    });

    this.notificationService.notifyBarber(updated, 'changed').catch((err) => {
      console.error('[Notification] Failed to notify barber of change:', err);
    });

    return updated;
  }
}
