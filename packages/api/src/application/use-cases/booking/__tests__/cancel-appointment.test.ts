import { describe, it, expect, vi } from 'vitest';
import { CancelAppointment } from '../cancel-appointment.js';
import { NotFoundError, ValidationError } from '../../../../shared/errors.js';
import type { AppointmentRepository } from '../../../../domain/repositories/appointment.repository.js';
import type { WhatsAppNotificationService } from '../../../../infrastructure/notifications/whatsapp-notification.service.js';

const confirmedAppointment = {
  id: 'appt-1',
  status: 'confirmed',
  customer: { id: 'cust-1', name: 'Maria', phone: '11999998888' },
  barber: { id: 'barber-1', firstName: 'João', lastName: 'Silva', phone: null },
  service: { name: 'Corte' },
};

function makeUseCase(appointment: unknown) {
  const appointmentRepo = {
    findByCancelToken: vi.fn().mockResolvedValue(appointment),
    updateStatus: vi.fn().mockResolvedValue(undefined),
  } as unknown as AppointmentRepository;

  const notificationService = {
    sendCancellationNotice: vi.fn().mockResolvedValue(undefined),
    notifyBarber: vi.fn().mockResolvedValue(undefined),
  } as unknown as WhatsAppNotificationService;

  return { useCase: new CancelAppointment(appointmentRepo, notificationService), appointmentRepo };
}

describe('CancelAppointment', () => {
  it('throws NotFoundError when token does not match any appointment', async () => {
    const { useCase } = makeUseCase(null);
    await expect(useCase.execute('bad-token', '8888')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('throws ValidationError when phone last 4 does not match', async () => {
    const { useCase } = makeUseCase(confirmedAppointment);
    await expect(useCase.execute('valid-token', '0000')).rejects.toBeInstanceOf(ValidationError);
  });

  it('throws ValidationError when appointment is already cancelled', async () => {
    const { useCase } = makeUseCase({ ...confirmedAppointment, status: 'cancelled' });
    await expect(useCase.execute('valid-token', '8888')).rejects.toBeInstanceOf(ValidationError);
  });

  it('throws ValidationError when appointment is completed', async () => {
    const { useCase } = makeUseCase({ ...confirmedAppointment, status: 'completed' });
    await expect(useCase.execute('valid-token', '8888')).rejects.toBeInstanceOf(ValidationError);
  });

  it('updates status to cancelled on success', async () => {
    const { useCase, appointmentRepo } = makeUseCase(confirmedAppointment);
    await useCase.execute('valid-token', '8888');
    expect(appointmentRepo.updateStatus).toHaveBeenCalledWith('appt-1', 'cancelled', expect.any(Date));
  });
});
