import type { AppointmentWithDetails } from '../../domain/entities/appointment.js';
import { env } from '../../config/env.js';
import { ChatwootClient } from './chatwoot.client.js';

const WEEKDAYS_PT: Record<number, string> = {
  0: 'Domingo',
  1: 'Segunda-feira',
  2: 'Terça-feira',
  3: 'Quarta-feira',
  4: 'Quinta-feira',
  5: 'Sexta-feira',
  6: 'Sábado',
};

function formatDate(date: Date): string {
  const weekday = WEEKDAYS_PT[date.getUTCDay()];
  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${weekday}, ${day}/${month}`;
}

function formatCurrency(cents: number): string {
  return `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`;
}

export class WhatsAppNotificationService {
  private client: ChatwootClient;

  constructor() {
    this.client = new ChatwootClient();
  }

  private async sendWithRetry(phone: string, name: string, message: string, retries = 3): Promise<void> {
    if (!this.client.isEnabled()) {
      console.log('[WhatsApp] Chatwoot not configured, skipping notification');
      console.log('[WhatsApp] Message:', message);
      return;
    }

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        await this.client.sendToPhone(phone, name, message);
        return;
      } catch (error) {
        console.error(`[WhatsApp] Attempt ${attempt}/${retries} failed:`, error);
        if (attempt < retries) {
          await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)));
        }
      }
    }
    console.error('[WhatsApp] All retry attempts exhausted');
  }

  async sendBookingConfirmation(appointment: AppointmentWithDetails): Promise<void> {
    if (!appointment.customer.phone) return;
    const cancelUrl = `${env.BASE_URL}/agendamento/${appointment.cancelToken}`;
    const message = [
      `✅ *Agendamento confirmado!*`,
      ``,
      `📍 *Soberano Barbearia*`,
      ``,
      `✂️ Serviço: ${appointment.service.name}`,
      `💈 Barbeiro: ${appointment.barber.firstName} ${appointment.barber.lastName}`,
      `📅 Data: ${formatDate(appointment.date)}`,
      `🕐 Horário: ${appointment.startTime}`,
      `💰 Valor: ${formatCurrency(appointment.priceCents)}`,
      ``,
      `Para cancelar ou alterar:`,
      cancelUrl,
    ].join('\n');

    await this.sendWithRetry(
      appointment.customer.phone,
      appointment.customer.name,
      message,
    );
  }

  async sendBarberCancellationToCustomer(appointment: AppointmentWithDetails, reason: string): Promise<void> {
    if (!appointment.customer.phone) return;
    const message = [
      `❌ *Seu agendamento foi cancelado*`,
      ``,
      `📍 *Soberano Barbearia*`,
      ``,
      `✂️ Serviço: ${appointment.service.name}`,
      `💈 Barbeiro: ${appointment.barber.firstName} ${appointment.barber.lastName}`,
      `📅 Data: ${formatDate(appointment.date)}`,
      `🕐 Horário: ${appointment.startTime}`,
      ``,
      `📝 Motivo: ${reason}`,
      ``,
      `Pedimos desculpas pelo transtorno. Para reagendar:`,
      env.BASE_URL,
    ].join('\n');

    await this.sendWithRetry(
      appointment.customer.phone,
      appointment.customer.name,
      message,
    );
  }

  async sendCancellationNotice(appointment: AppointmentWithDetails): Promise<void> {
    if (!appointment.customer.phone) return;
    const message = [
      `❌ *Agendamento cancelado*`,
      ``,
      `📍 *Soberano Barbearia*`,
      ``,
      `✂️ Serviço: ${appointment.service.name}`,
      `📅 Data: ${formatDate(appointment.date)}`,
      `🕐 Horário: ${appointment.startTime}`,
      ``,
      `Seu agendamento foi cancelado com sucesso.`,
      `Para fazer um novo agendamento, acesse:`,
      env.BASE_URL,
    ].join('\n');

    await this.sendWithRetry(
      appointment.customer.phone,
      appointment.customer.name,
      message,
    );
  }

  async sendChangeNotice(appointment: AppointmentWithDetails): Promise<void> {
    if (!appointment.customer.phone) return;
    const cancelUrl = `${env.BASE_URL}/agendamento/${appointment.cancelToken}`;
    const message = [
      `🔄 *Agendamento alterado!*`,
      ``,
      `📍 *Soberano Barbearia*`,
      ``,
      `✂️ Serviço: ${appointment.service.name}`,
      `💈 Barbeiro: ${appointment.barber.firstName} ${appointment.barber.lastName}`,
      `📅 Nova data: ${formatDate(appointment.date)}`,
      `🕐 Novo horário: ${appointment.startTime}`,
      `💰 Valor: ${formatCurrency(appointment.priceCents)}`,
      ``,
      `Para cancelar ou alterar novamente:`,
      cancelUrl,
    ].join('\n');

    await this.sendWithRetry(
      appointment.customer.phone,
      appointment.customer.name,
      message,
    );
  }

  async sendReminder(appointment: AppointmentWithDetails): Promise<void> {
    if (!appointment.customer.phone) return;
    const cancelUrl = `${env.BASE_URL}/agendamento/${appointment.cancelToken}`;
    const message = [
      `⏰ *Lembrete: seu horário é em breve!*`,
      ``,
      `📍 *Soberano Barbearia*`,
      ``,
      `✂️ Serviço: ${appointment.service.name}`,
      `💈 Barbeiro: ${appointment.barber.firstName} ${appointment.barber.lastName}`,
      `🕐 Horário: ${appointment.startTime}`,
      ``,
      `Caso precise cancelar:`,
      cancelUrl,
    ].join('\n');

    await this.sendWithRetry(
      appointment.customer.phone,
      appointment.customer.name,
      message,
    );
  }

  async sendBarberReminder(appointment: AppointmentWithDetails): Promise<void> {
    if (!appointment.barber.phone) {
      console.log(`[WhatsApp] Barber ${appointment.barber.firstName} has no phone configured, skipping reminder`);
      return;
    }

    const message = [
      `⏰ *Lembrete: você tem um cliente em breve!*`,
      ``,
      `👤 Cliente: ${appointment.customer.name}`,
      `✂️ Serviço: ${appointment.service.name}`,
      `🕐 Horário: ${appointment.startTime}`,
    ].join('\n');

    const barberFullName = `${appointment.barber.firstName} ${appointment.barber.lastName}`;
    await this.sendWithRetry(appointment.barber.phone, barberFullName, message);
  }

  async notifyBarber(appointment: AppointmentWithDetails, event: 'booked' | 'cancelled' | 'changed'): Promise<void> {
    if (!appointment.barber.phone) {
      console.log(`[WhatsApp] Barber ${appointment.barber.firstName} has no phone configured, skipping notification`);
      return;
    }

    const eventLabels = {
      booked: '✅ *Novo agendamento!*',
      cancelled: '❌ *Agendamento cancelado pelo cliente*',
      changed: '🔄 *Agendamento alterado pelo cliente*',
    };

    const message = [
      eventLabels[event],
      ``,
      `👤 Cliente: ${appointment.customer.name}`,
      ...(appointment.customer.phone ? [`📱 WhatsApp: +55 ${appointment.customer.phone}`] : []),
      `✂️ Serviço: ${appointment.service.name}`,
      `📅 Data: ${formatDate(appointment.date)}`,
      `🕐 Horário: ${appointment.startTime}`,
      `💰 Valor: ${formatCurrency(appointment.priceCents)}`,
    ].join('\n');

    const barberFullName = `${appointment.barber.firstName} ${appointment.barber.lastName}`;
    await this.sendWithRetry(appointment.barber.phone, barberFullName, message);
  }
}
