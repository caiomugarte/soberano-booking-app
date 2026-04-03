import cron from 'node-cron';
import { PrismaAppointmentRepository } from '../database/repositories/prisma-appointment.repository.js';
import { WhatsAppNotificationService } from '../notifications/whatsapp-notification.service.js';

const appointmentRepo = new PrismaAppointmentRepository();
const notificationService = new WhatsAppNotificationService();

export function startReminderJob(): void {
  // Run every 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    try {
      const upcoming = await appointmentRepo.findUpcomingWithoutReminder(60);

      for (const appointment of upcoming) {
        try {
          await notificationService.sendReminder(appointment);
          await appointmentRepo.markReminderSent(appointment.id);
          console.log(`[Reminder] Sent reminder for appointment ${appointment.id}`);
        } catch (err) {
          console.error(`[Reminder] Failed for appointment ${appointment.id}:`, err);
        }
      }
    } catch (err) {
      console.error('[Reminder] Job failed:', err);
    }

    try {
      const upcomingForBarbers = await appointmentRepo.findUpcomingWithoutBarberReminder(60);

      for (const appointment of upcomingForBarbers) {
        try {
          await notificationService.sendBarberReminder(appointment);
          await appointmentRepo.markBarberReminderSent(appointment.id);
          console.log(`[Reminder] Sent barber reminder for appointment ${appointment.id}`);
        } catch (err) {
          console.error(`[Reminder] Failed barber reminder for appointment ${appointment.id}:`, err);
        }
      }
    } catch (err) {
      console.error('[Reminder] Barber reminder job failed:', err);
    }
  });

  console.log('[Reminder] Reminder job started (every 15 minutes)');
}
