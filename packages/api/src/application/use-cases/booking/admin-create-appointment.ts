import crypto from 'node:crypto';
import type { AppointmentRepository } from '../../../domain/repositories/appointment.repository.js';
import type { ServiceRepository } from '../../../domain/repositories/service.repository.js';
import type { ProviderRepository } from '../../../domain/repositories/provider.repository.js';
import type { CustomerRepository } from '../../../domain/repositories/customer.repository.js';
import type { CustomerPackageRepository } from '../../../domain/repositories/customer-package.repository.js';
import type { AppointmentWithDetails } from '../../../domain/entities/appointment.js';
import { NotFoundError, SlotTakenError, ValidationError } from '../../../shared/errors.js';
import { WhatsAppNotificationService } from '../../../infrastructure/notifications/whatsapp-notification.service.js';

interface AdminCreateAppointmentInput {
  tenantId: string;
  serviceId: string;
  barberId: string;
  date: string;
  startTime: string;
  customerName: string;
  customerPhone?: string;
  priceCents?: number;
  bookingUrl: string;
  packageId?: string;
}

export class AdminCreateAppointment {
  constructor(
    private appointmentRepo: AppointmentRepository,
    private serviceRepo: ServiceRepository,
    private barberRepo: ProviderRepository,
    private customerRepo: CustomerRepository,
    private notificationService: WhatsAppNotificationService,
    private packageRepo?: CustomerPackageRepository,
  ) {}

  async execute(input: AdminCreateAppointmentInput): Promise<{ appointment: AppointmentWithDetails; cancelUrl: string }> {
    const service = await this.serviceRepo.findById(input.serviceId);
    if (!service || !service.isActive) throw new NotFoundError('Serviço');

    const barber = await this.barberRepo.findById(input.barberId);
    if (!barber || !barber.isActive) throw new NotFoundError('Barbeiro');

    const date = new Date(input.date + 'T00:00:00');

    const [h, m] = input.startTime.split(':').map(Number);
    const endMinutes = h * 60 + m + service.duration;
    const endTime = `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`;

    let packagePriceCents: number | undefined;
    if (input.packageId && this.packageRepo) {
      const pkg = await this.packageRepo.findByIdAndTenant(input.packageId, input.tenantId);
      if (!pkg || pkg.status !== 'active') throw new ValidationError('Pacote inválido ou já utilizado.');
      packagePriceCents = Math.floor(pkg.totalPriceCents / pkg.totalUses);
    }

    const customer = input.customerPhone
      ? await this.customerRepo.upsertByPhone(input.customerPhone, input.customerName, input.tenantId)
      : await this.customerRepo.createWalkin(input.customerName, input.tenantId);
    const cancelToken = crypto.randomBytes(32).toString('hex');

    let appointment: AppointmentWithDetails;
    try {
      appointment = await this.appointmentRepo.create({
        tenantId: input.tenantId,
        barberId: input.barberId,
        serviceId: input.serviceId,
        customerId: customer.id,
        ...(input.packageId ? { packageId: input.packageId } : {}),
        date,
        startTime: input.startTime,
        endTime,
        priceCents: input.priceCents ?? packagePriceCents ?? service.priceCents,
        cancelToken,
      });
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') throw new SlotTakenError();
      throw error;
    }

    if (input.packageId && this.packageRepo) {
      await this.packageRepo.incrementUsedCount(input.packageId);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (input.customerPhone && date >= today) {
      this.notificationService.sendBookingConfirmation(appointment).catch((err) => {
        console.error('[Notification] Failed to send booking confirmation:', err);
      });
      this.notificationService.notifyBarber(appointment, 'booked').catch((err) => {
        console.error('[Notification] Failed to notify barber:', err);
      });
    }

    const cancelUrl = `${input.bookingUrl}/agendamento/${cancelToken}`;
    return { appointment, cancelUrl };
  }
}
