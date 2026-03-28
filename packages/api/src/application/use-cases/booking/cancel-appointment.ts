import { APPOINTMENT_STATUS } from '@soberano/shared';
import type { AppointmentRepository } from '../../../domain/repositories/appointment.repository.js';
import { NotFoundError, ValidationError } from '../../../shared/errors.js';
import { WhatsAppNotificationService } from '../../../infrastructure/notifications/whatsapp-notification.service.js';

export class CancelAppointment {
  constructor(
    private appointmentRepo: AppointmentRepository,
    private notificationService: WhatsAppNotificationService,
  ) {}

  async execute(cancelToken: string, phoneLastFour: string): Promise<void> {
    const appointment = await this.appointmentRepo.findByCancelToken(cancelToken);
    if (!appointment) {
      throw new NotFoundError('Agendamento');
    }

    // Verify phone
    if (!appointment.customer.phone.endsWith(phoneLastFour)) {
      throw new ValidationError('Telefone não confere.');
    }

    if (appointment.status !== APPOINTMENT_STATUS.CONFIRMED) {
      throw new ValidationError('Este agendamento não pode ser cancelado.');
    }

    await this.appointmentRepo.updateStatus(
      appointment.id,
      APPOINTMENT_STATUS.CANCELLED,
      new Date(),
    );

    // Notify customer and barber
    this.notificationService.sendCancellationNotice(appointment).catch((err) => {
      console.error('[Notification] Failed to send cancellation notice:', err);
    });

    this.notificationService.notifyBarber(appointment, 'cancelled').catch((err) => {
      console.error('[Notification] Failed to notify barber of cancellation:', err);
    });
  }
}
