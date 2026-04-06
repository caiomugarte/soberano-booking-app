import { useEffect, useState, type ChangeEvent } from 'react';
import { Button } from '@soberano/ui';
import { Input } from '@soberano/ui';
import { formatPhone, stripPhone } from '../../lib/format.ts';
import { useAdminCreateBooking, useAdminCustomerLookup } from '../../api/use-admin.ts';
import { useServices } from '../../api/use-services.ts';

interface AdminBookingModalProps {
  onClose: () => void;
}

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

export function AdminBookingModal({ onClose }: AdminBookingModalProps) {
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [timeError, setTimeError] = useState('');
  const [lookupPhone, setLookupPhone] = useState('');

  const { data: services } = useServices();
  const customerLookup = useAdminCustomerLookup(lookupPhone);
  const createBooking = useAdminCreateBooking();

  // Debounced lookup trigger
  useEffect(() => {
    const stripped = stripPhone(phone);
    if (stripped.length < 10) return;
    const timer = setTimeout(() => {
      setLookupPhone(stripped);
    }, 400);
    return () => clearTimeout(timer);
  }, [phone]);

  // Auto-fill name from lookup
  useEffect(() => {
    if (customerLookup.data?.name) {
      setName(customerLookup.data.name);
    }
  }, [customerLookup.data]);

  // Close on success
  useEffect(() => {
    if (createBooking.isSuccess) {
      onClose();
    }
  }, [createBooking.isSuccess, onClose]);

  const strippedPhone = stripPhone(phone);

  const isValid =
    name.trim().length >= 2 &&
    serviceId.length > 0 &&
    date.length > 0 &&
    TIME_REGEX.test(time);

  function handleTimeChange(e: ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 4);
    const masked = digits.length > 2 ? digits.slice(0, 2) + ':' + digits.slice(2) : digits;
    setTime(masked);
    if (timeError) setTimeError('');
  }

  function handleTimeBlur() {
    if (time && !TIME_REGEX.test(time)) {
      setTimeError('Formato inválido. Use HH:MM (ex: 09:00)');
    } else {
      setTimeError('');
    }
  }

  function handleSubmit() {
    if (!isValid) return;
    createBooking.mutate({
      serviceId,
      date,
      startTime: time,
      customerName: name.trim(),
      ...(strippedPhone.length >= 10 ? { customerPhone: strippedPhone } : {}),
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-dark-surface border border-dark-border rounded-2xl p-6 w-full max-w-sm">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-serif text-base tracking-widest uppercase text-gold">Novo Agendamento</h2>
          <button
            onClick={onClose}
            className="text-muted hover:text-[#F0EDE8] transition-colors bg-transparent border-none cursor-pointer text-lg leading-none"
          >
            ×
          </button>
        </div>

        <Input
          label="Telefone"
          inputMode="tel"
          placeholder="(11) 99999-9999"
          value={formatPhone(phone)}
          onChange={(e) => setPhone(e.target.value)}
        />

        <Input
          label="Nome"
          placeholder="Nome do cliente"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <div className="mb-5">
          <label className="block text-[11px] tracking-[0.12em] uppercase text-muted mb-2">
            Serviço
          </label>
          <select
            value={serviceId}
            onChange={(e) => setServiceId(e.target.value)}
            className="w-full bg-dark border border-dark-border rounded-xl px-4 py-3 text-sm text-[#F0EDE8] outline-none focus:border-gold appearance-none"
          >
            <option value="">Selecione um serviço</option>
            {services?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.icon} {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-5">
          <label className="block text-[11px] tracking-[0.12em] uppercase text-muted mb-2">
            Data
          </label>
          <input
            type="date"
            value={date}
            max="2099-12-31"
            onChange={(e) => setDate(e.target.value)}
            className="w-full bg-dark border border-dark-border rounded-xl px-4 py-3 text-sm text-[#F0EDE8] outline-none focus:border-gold"
          />
        </div>

        <div className="mb-5">
          <Input
            label="Horário"
            placeholder="09:00"
            value={time}
            onChange={handleTimeChange}
            onBlur={handleTimeBlur}
          />
          {timeError && <p className="text-red-400 text-xs mt-1">{timeError}</p>}
        </div>

        <Button
          onClick={handleSubmit}
          disabled={!isValid || createBooking.isPending}
          loading={createBooking.isPending}
          className="w-full"
        >
          Confirmar Agendamento
        </Button>

        {createBooking.isError && (
          <p className="text-red-400 text-xs text-center mt-2">{(createBooking.error as Error)?.message}</p>
        )}
      </div>
    </div>
  );
}
