import cron from 'node-cron';
import { prisma } from '../../config/database.js';
import { createTenantPrisma } from '../../config/tenant-prisma.js';
import { tenantConfigSchema } from '@soberano/shared';
import { PrismaAppointmentRepository } from '../database/repositories/prisma-appointment.repository.js';
import { ChatwootClient } from '../notifications/chatwoot.client.js';
import { WhatsAppNotificationService } from '../notifications/whatsapp-notification.service.js';

function gaussianDelay(meanMs: number, stdMs: number, minMs: number, maxMs: number): Promise<void> {
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  const ms = Math.min(Math.max(Math.round(meanMs + z * stdMs), minMs), maxMs);
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function startReminderJob(): void {
  // Run every 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    const tenants = await prisma.tenant.findMany({ where: { isActive: true } });

    for (const tenant of tenants) {
      try {
        const config = tenantConfigSchema.parse(tenant.config);
        const tenantPrisma = createTenantPrisma(tenant.id);
        const appointmentRepo = new PrismaAppointmentRepository(tenantPrisma);
        const chatwootClient = new ChatwootClient(config);
        const notificationService = new WhatsAppNotificationService(config, chatwootClient);

        try {
          const upcoming = await appointmentRepo.findUpcomingWithoutReminder(60);

          for (let i = 0; i < upcoming.length; i++) {
            const appointment = upcoming[i];
            try {
              await notificationService.sendReminder(appointment);
              await appointmentRepo.markReminderSent(appointment.id);
              console.log(`[Reminder] Sent reminder for appointment ${appointment.id} (tenant: ${tenant.id})`);
            } catch (err) {
              console.error(`[Reminder] Failed for appointment ${appointment.id}:`, err);
            }
            if (i < upcoming.length - 1) {
              await gaussianDelay(8000, 3000, 3000, 20000);
            }
          }
        } catch (err) {
          console.error(`[Reminder] Job failed for tenant ${tenant.id}:`, err);
        }

        try {
          const upcomingForBarbers = await appointmentRepo.findUpcomingWithoutBarberReminder(60);

          for (let i = 0; i < upcomingForBarbers.length; i++) {
            const appointment = upcomingForBarbers[i];
            try {
              await notificationService.sendBarberReminder(appointment);
              await appointmentRepo.markBarberReminderSent(appointment.id);
              console.log(`[Reminder] Sent barber reminder for appointment ${appointment.id} (tenant: ${tenant.id})`);
            } catch (err) {
              console.error(`[Reminder] Failed barber reminder for appointment ${appointment.id}:`, err);
            }
            if (i < upcomingForBarbers.length - 1) {
              await gaussianDelay(8000, 3000, 3000, 20000);
            }
          }
        } catch (err) {
          console.error(`[Reminder] Barber reminder job failed for tenant ${tenant.id}:`, err);
        }
      } catch (err) {
        console.error(`[Reminder] Failed to process tenant ${tenant.id}:`, err);
      }
    }
  });

  console.log('[Reminder] Reminder job started (every 15 minutes)');
}
