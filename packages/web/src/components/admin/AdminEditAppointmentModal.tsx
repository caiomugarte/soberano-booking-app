import { useState } from 'react';
import {
  type AdminAppointment,
  useAdminUpdateAppointmentCustomer,
  useAdminUpdateAppointmentSchedule,
} from '../../api/use-admin.ts';
import { useServices } from '../../api/use-services.ts';
import { useSlots } from '../../api/use-slots.ts';
import { Button } from '../ui/Button.tsx';

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

interface AdminEditAppointmentModalProps {
  appointment: AdminAppointment;
  barberId: string | null;
  onClose: () => void;
}

export function AdminEditAppointmentModal({
  appointment,
  barberId,
  onClose,
}: AdminEditAppointmentModalProps) {
  const [name, setName] = useState(appointment.customer.name);
  const [phone, setPhone] = useState(appointment.customer.phone ?? '');
  const [serviceId, setServiceId] = useState(appointment.service.id);
  const [date, setDate] = useState(appointment.date.slice(0, 10));
  const [time, setTime] = useState(appointment.startTime);

  const { data: services } = useServices();
  const { data: slots } = useSlots(barberId, date, appointment.id);
  const updateCustomer = useAdminUpdateAppointmentCustomer();
  const updateSchedule = useAdminUpdateAppointmentSchedule();

  const isPending = updateCustomer.isPending || updateSchedule.isPending;
  const error = (updateCustomer.error || updateSchedule.error) as Error | null;

  const phoneChanged = phone !== (appointment.customer.phone ?? '');
  const nameChanged = name !== appointment.customer.name;
  const serviceChanged = serviceId !== appointment.service.id;
  const dateChanged = date !== appointment.date.slice(0, 10);
  const timeChanged = time !== appointment.startTime;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const selectedDate = date ? new Date(date + 'T00:00:00') : null;
  const newDateIsInThePast = selectedDate !== null && selectedDate < today;

  const customerValid = name.trim().length > 0 && (phone === '' || /^\d{10,11}$/.test(phone));
  const scheduleValid = TIME_REGEX.test(time) && date.length > 0;
  const hasChanges = nameChanged || phoneChanged || serviceChanged || dateChanged || timeChanged;
  const canSave = hasChanges && customerValid && scheduleValid;

  function handleTimeChange(raw: string) {
    const digits = raw.replace(/\D/g, '').slice(0, 4);
    setTime(digits.length > 2 ? `${digits.slice(0, 2)}:${digits.slice(2)}` : digits);
  }

  async function handleSave() {
    const customerDirty = nameChanged || phoneChanged;
    const scheduleDirty = serviceChanged || dateChanged || timeChanged;

    try {
      // Customer must complete first so the schedule notification reaches the correct phone
      if (customerDirty) {
        const payload: { id: string; name?: string; phone?: string } = { id: appointment.id };
        if (nameChanged) payload.name = name.trim();
        if (phoneChanged && phone) payload.phone = phone;
        await updateCustomer.mutateAsync(payload);
      }

      if (scheduleDirty) {
        const payload: { id: string; serviceId?: string; date?: string; startTime?: string; packageId?: string | null } = {
          id: appointment.id,
          packageId: appointment.packageId,
        };
        if (serviceChanged) payload.serviceId = serviceId;
        if (dateChanged) payload.date = date;
        if (timeChanged) payload.startTime = time;
        await updateSchedule.mutateAsync(payload);
      }

      onClose();
    } catch {}
  }

  const availableSlots = slots?.filter((slot) => slot.available) ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-dark-surface border border-dark-border rounded-2xl w-full max-w-sm max-h-[90dvh] overflow-hidden flex flex-col">
        <div className="overflow-y-auto p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-serif text-base tracking-widest uppercase text-gold">Editar Agendamento</h2>
            <button
              onClick={onClose}
              className="text-muted hover:text-[#F0EDE8] transition-colors bg-transparent border-none cursor-pointer text-lg leading-none"
            >
              ×
            </button>
          </div>

          <div className="mb-4">
            <label className="block text-[11px] tracking-[0.12em] uppercase text-muted mb-2">Serviço</label>
            <select
              value={serviceId}
              onChange={(e) => setServiceId(e.target.value)}
              className="w-full bg-dark border border-dark-border rounded-xl px-4 py-3 text-sm text-[#F0EDE8] outline-none focus:border-gold appearance-none"
            >
              {services?.map((service) => (
                <option key={service.id} value={service.id}>{service.icon} {service.name}</option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-[11px] tracking-[0.12em] uppercase text-muted mb-2">Data</label>
            <div className="relative">
              {!date && (
                <span className="absolute inset-0 flex items-center px-4 text-sm text-[#F0EDE8] pointer-events-none">
                  Selecione uma data
                </span>
              )}
              <input
                type="date"
                value={date}
                max="2099-12-31"
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-dark border border-dark-border rounded-xl px-4 py-3 text-sm text-[#F0EDE8] outline-none focus:border-gold appearance-none min-h-[50px]"
              />
            </div>
          </div>

          <div className="mb-5">
            <label className="block text-[11px] tracking-[0.12em] uppercase text-muted mb-2">Horário</label>
            <input
              value={time}
              onChange={(e) => handleTimeChange(e.target.value)}
              placeholder="09:00"
              className="w-full bg-dark border border-dark-border rounded-xl px-4 py-3 text-sm text-[#F0EDE8] outline-none focus:border-gold"
            />
            {availableSlots.length > 0 && (
              <div className="mt-2">
                <p className="text-[11px] tracking-[0.12em] uppercase text-muted mb-1.5">Horários Disponíveis</p>
                <div className="flex flex-wrap gap-1.5">
                  {availableSlots.map((slot) => (
                    <button
                      key={slot.time}
                      type="button"
                      onClick={() => setTime(slot.time)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer
                        ${time === slot.time
                          ? 'border-gold bg-gold/20 text-gold'
                          : 'border-dark-border bg-dark text-muted hover:border-gold/40 hover:text-[#F0EDE8]'
                        }`}
                    >
                      {slot.time}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {(dateChanged || timeChanged) && !newDateIsInThePast && (
              <p className="text-xs text-gold/80 mt-2">O cliente receberá uma mensagem no WhatsApp com o novo horário.</p>
            )}
          </div>

          <div className="border-t border-dark-border mb-5" />

          <p className="text-[11px] tracking-[0.12em] uppercase text-muted mb-3">Cliente</p>

          <div className="mb-4">
            <label className="block text-[11px] tracking-[0.12em] uppercase text-muted mb-2">Nome</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-dark border border-dark-border rounded-xl px-4 py-3 text-sm text-[#F0EDE8] outline-none focus:border-gold"
            />
          </div>

          <div className="mb-5">
            <label className="block text-[11px] tracking-[0.12em] uppercase text-muted mb-2">Telefone (somente números)</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
              placeholder="Ex: 11999998888"
              className="w-full bg-dark border border-dark-border rounded-xl px-4 py-3 text-sm text-[#F0EDE8] placeholder-muted outline-none focus:border-gold"
            />
            {phone && !/^\d{10,11}$/.test(phone) && (
              <p className="text-xs text-red-400 mt-1">Telefone deve ter 10 ou 11 dígitos.</p>
            )}
            {phoneChanged && /^\d{10,11}$/.test(phone) && (
              <p className="text-xs text-gold/80 mt-1">O cliente receberá uma nova confirmação no novo número.</p>
            )}
          </div>

          {error && <p className="text-red-400 text-xs text-center mb-3">{error.message}</p>}

          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isPending}
              className="flex-1 py-2.5 rounded-xl border border-dark-border text-muted hover:text-[#F0EDE8] transition-colors text-sm cursor-pointer bg-transparent disabled:opacity-50"
            >
              Voltar
            </button>
            <Button
              onClick={handleSave}
              disabled={!canSave}
              loading={isPending}
              className="flex-1"
            >
              Salvar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
