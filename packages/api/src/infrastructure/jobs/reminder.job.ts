import cron from 'node-cron';
import { PrismaAppointmentRepository } from '../database/repositories/prisma-appointment.repository.js';
import { createNotificationService } from '../notifications/whatsapp-notification.service.js';

function gaussianDelay(meanMs: number, stdMs: number, minMs: number, maxMs: number): Promise<void> {
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  const ms = Math.min(Math.max(Math.round(meanMs + z * stdMs), minMs), maxMs);
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const appointmentRepo = new PrismaAppointmentRepository();

export function startReminderJob(): void {
  // Run every 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    try {
      const upcoming = await appointmentRepo.findUpcomingWithoutReminder(60);

      for (let i = 0; i < upcoming.length; i++) {
        const appointment = upcoming[i];
        try {
          const notificationSvc = createNotificationService((appointment as any).client);
          await notificationSvc.sendReminder(appointment);
          await appointmentRepo.markReminderSent(appointment.id);
          console.log(`[Reminder] Sent reminder for appointment ${appointment.id}`);
        } catch (err) {
          console.error(`[Reminder] Failed for appointment ${appointment.id}:`, err);
        }
        if (i < upcoming.length - 1) {
          await gaussianDelay(8000, 3000, 3000, 20000);
        }
      }
    } catch (err) {
      console.error('[Reminder] Job failed:', err);
    }

    try {
      const upcomingForBarbers = await appointmentRepo.findUpcomingWithoutBarberReminder(60);

      for (let i = 0; i < upcomingForBarbers.length; i++) {
        const appointment = upcomingForBarbers[i];
        try {
          const notificationSvc = createNotificationService((appointment as any).client);
          await notificationSvc.sendBarberReminder(appointment);
          await appointmentRepo.markBarberReminderSent(appointment.id);
          console.log(`[Reminder] Sent barber reminder for appointment ${appointment.id}`);
        } catch (err) {
          console.error(`[Reminder] Failed barber reminder for appointment ${appointment.id}:`, err);
        }
        if (i < upcomingForBarbers.length - 1) {
          await gaussianDelay(8000, 3000, 3000, 20000);
        }
      }
    } catch (err) {
      console.error('[Reminder] Barber reminder job failed:', err);
    }
  });

  console.log('[Reminder] Reminder job started (every 15 minutes)');
}
