import { APPOINTMENT_STATUS } from '@soberano/shared';
import type { AppointmentWithDetails } from '../../../domain/entities/appointment.js';
import type { CustomerPackageRepository } from '../../../domain/repositories/customer-package.repository.js';

export type PackageLifecycleEvent =
  | 'appointment_created'
  | 'appointment_completed'
  | 'appointment_no_show'
  | 'appointment_cancelled'
  | 'appointment_deleted'
  | 'appointment_rescheduled';

export interface PackageLifecycleNotifier {
  sendPackagePaymentReminder(
    appointment: AppointmentWithDetails,
    totalPriceCents: number,
  ): Promise<void>;
}

interface SyncPackageLifecycleInput {
  packageId?: string | null;
  tenantId: string;
  providerId: string;
  event: PackageLifecycleEvent;
  appointment?: AppointmentWithDetails | null;
}

export class PackageLifecycleManager {
  constructor(
    private readonly packageRepo: CustomerPackageRepository,
    private readonly notifier?: PackageLifecycleNotifier,
  ) {}

  async syncForAppointment(input: SyncPackageLifecycleInput): Promise<void> {
    if (!input.packageId) return;

    const previousPackage = await this.packageRepo.findByIdForProvider(
      input.packageId,
      input.tenantId,
      input.providerId,
    );

    if (!previousPackage) return;

    const nextPackage = await this.packageRepo.reevaluateLifecycle(input.packageId);
    if (!nextPackage) return;

    if (
      input.event !== 'appointment_completed' ||
      !input.appointment ||
      !this.notifier ||
      input.appointment.status !== APPOINTMENT_STATUS.CONFIRMED ||
      previousPackage.status === 'cancelled' ||
      nextPackage.status !== 'completed'
    ) {
      return;
    }

    await this.notifier
      .sendPackagePaymentReminder(input.appointment, nextPackage.totalPriceCents)
      .catch((error: unknown) => {
        console.error('[Notification] Failed to send package payment reminder:', error);
      });
  }
}
