import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Button } from '../ui/Button.tsx';
import { Input } from '../ui/Input.tsx';
import { formatPhone, stripPhone } from '../../lib/format.ts';
import { useAdminCreateBooking, useAdminCustomerLookup } from '../../api/use-admin.ts';
import { useServices } from '../../api/use-services.ts';
import { useSlots } from '../../api/use-slots.ts';

interface AdminBookingModalProps {
  barberId: string | null;
  onClose: () => void;
}

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

export function AdminBookingModal({ barberId, onClose }: AdminBookingModalProps) {
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [priceDisplay, setPriceDisplay] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [timeError, setTimeError] = useState('');
  const [lookupPhone, setLookupPhone] = useState('');
  const dateInputRef = useRef<HTMLInputElement>(null);

  const { data: services } = useServices();
  const customerLookup = useAdminCustomerLookup(lookupPhone);
  const createBooking = useAdminCreateBooking();
  const { data: slots } = useSlots(barberId, date || null);

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

  const parsedPriceCents = Math.round(parseFloat(priceDisplay.replace(',', '.')) * 100);
  const isPriceValid = priceDisplay === '' || (!isNaN(parsedPriceCents) && parsedPriceCents > 0);

  const isValid =
    name.trim().length >= 2 &&
    serviceId.length > 0 &&
    date.length > 0 &&
    TIME_REGEX.test(time) &&
    isPriceValid;

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
    const selectedService = services?.find((s) => s.id === serviceId);
    const customPrice = priceDisplay !== '' ? parsedPriceCents : undefined;
    const defaultPrice = selectedService?.priceCents;
    createBooking.mutate({
      serviceId,
      date,
      startTime: time,
      customerName: name.trim(),
      ...(strippedPhone.length >= 10 ? { customerPhone: strippedPhone } : {}),
      ...(customPrice !== undefined && customPrice !== defaultPrice ? { priceCents: customPrice } : {}),
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-dark-surface border border-dark-border rounded-2xl w-full max-w-sm max-h-[90dvh] overflow-hidden flex flex-col">
      <div className="overflow-y-auto p-6">
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
            onChange={(e) => {
              const id = e.target.value;
              setServiceId(id);
              const svc = services?.find((s) => s.id === id);
              setPriceDisplay(svc ? (svc.priceCents / 100).toFixed(2).replace('.', ',') : '');
            }}
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

        <Input
          label="Preço (R$)"
          inputMode="decimal"
          placeholder="0,00"
          value={priceDisplay}
          onChange={(e) => setPriceDisplay(e.target.value)}
        />

        <div className="mb-5">
          <label className="block text-[11px] tracking-[0.12em] uppercase text-muted mb-2">
            Data
          </label>
          <div className="relative w-full bg-dark border border-dark-border rounded-xl min-h-[50px] focus-within:border-gold">
            <div className="absolute inset-0 px-4 text-sm flex items-center pointer-events-none select-none">
              <span className={date ? 'text-[#F0EDE8]' : 'text-muted'}>
                {date ? date.split('-').reverse().join('/') : 'Selecione uma data'}
              </span>
            </div>
            <input
              ref={dateInputRef}
              type="date"
              value={date}
              max="2099-12-31"
              onChange={(e) => setDate(e.target.value)}
              onClick={() => dateInputRef.current?.showPicker?.()}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>
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
          {slots && slots.filter((s) => s.available).length > 0 && (
            <div className="mt-2">
            <p className="text-[11px] tracking-[0.12em] uppercase text-muted mb-1.5">Horários Disponíveis</p>
            <div className="flex flex-wrap gap-1.5">
              {slots.filter((s) => s.available).map((s) => (
                <button
                  key={s.time}
                  type="button"
                  onClick={() => { setTime(s.time); setTimeError(''); }}
                  className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors cursor-pointer
                    ${time === s.time
                      ? 'border-gold bg-gold/20 text-gold'
                      : 'border-dark-border bg-dark text-muted hover:border-gold/40 hover:text-[#F0EDE8]'
                    }`}
                >
                  {s.time}
                </button>
              ))}
            </div>
            </div>
          )}
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
    </div>
  );
}
