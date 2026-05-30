import { APPOINTMENT_STATUS } from '@soberano/shared';
import type { AppointmentWithDetails } from '../../../domain/entities/appointment.js';
import type { CustomerPackageEntity, CustomerPackageLinkedAppointmentEntity } from '../../../domain/entities/customer-package.js';
import type { AppointmentRepository } from '../../../domain/repositories/appointment.repository.js';
import type { CustomerPackageRepository } from '../../../domain/repositories/customer-package.repository.js';

interface DeactivatePackageInput {
  id: string;
  tenantId: string;
  providerId: string;
  cancellationReason: string;
}

export interface PackageDeactivationNotifier {
  sendBarberCancellationToCustomer(
    appointment: AppointmentWithDetails,
    reason: string,
  ): Promise<void>;
}

function getCurrentLifecycleWindow(): { today: string; currentTime: string } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString().slice(0, 10);
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  return { today, currentTime };
}

function isFutureConfirmedAppointment(
  appointment: CustomerPackageLinkedAppointmentEntity,
  today: string,
  currentTime: string,
): boolean {
  const appointmentDate = appointment.date.toISOString().slice(0, 10);
  return (
    appointment.status === APPOINTMENT_STATUS.CONFIRMED &&
    (appointmentDate > today || (appointmentDate === today && appointment.startTime > currentTime))
  );
}

export class DeactivatePackage {
  constructor(
    private readonly packageRepo: CustomerPackageRepository,
    private readonly appointmentRepo: AppointmentRepository,
    private readonly notifier?: PackageDeactivationNotifier,
  ) {}

  async execute(input: DeactivatePackageInput): Promise<CustomerPackageEntity> {
    const details = await this.packageRepo.findDetailsByIdForProvider(
      input.id,
      input.tenantId,
      input.providerId,
    );

    const { today, currentTime } = getCurrentLifecycleWindow();
    const appointmentIdsToNotify =
      details?.linkedAppointments
        .filter((appointment) => isFutureConfirmedAppointment(appointment, today, currentTime))
        .map((appointment) => appointment.id) ?? [];

    const pkg = await this.packageRepo.deactivate(input.id, input.tenantId, input.providerId);

    if (!this.notifier || appointmentIdsToNotify.length === 0) {
      return pkg;
    }

    await Promise.all(
      appointmentIdsToNotify.map(async (appointmentId) => {
        try {
          const appointment = await this.appointmentRepo.findById(appointmentId);
          if (!appointment) return;

          await this.notifier!.sendBarberCancellationToCustomer(
            appointment,
            input.cancellationReason,
          );
        } catch (error: unknown) {
          console.error('[WhatsApp] Failed to send package deactivation cancellation notice:', error);
        }
      }),
    );

    return pkg;
  }
}
