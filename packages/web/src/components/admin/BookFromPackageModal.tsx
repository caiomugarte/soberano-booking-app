import { useRef, useState, type ChangeEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '../ui/Button.tsx';
import { Input } from '../ui/Input.tsx';
import { useAdminCreateBooking, type CustomerPackage } from '../../api/use-admin.ts';
import { useServices } from '../../api/use-services.ts';
import { useSlots } from '../../api/use-slots.ts';
import { stripPhone } from '../../lib/format.ts';

interface BookFromPackageModalProps {
  pkg: CustomerPackage;
  barberId: string | null;
  onClose: () => void;
}

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

export function BookFromPackageModal({ pkg, barberId, onClose }: BookFromPackageModalProps) {
  const [serviceId, setServiceId] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [timeError, setTimeError] = useState('');
  const [bookedCount, setBookedCount] = useState(0);
  const dateInputRef = useRef<HTMLInputElement>(null);

  const { data: services } = useServices();
  const { data: slots } = useSlots(barberId, date || null);
  const createBooking = useAdminCreateBooking();
  const queryClient = useQueryClient();

  const remainingUses = pkg.totalUses - pkg.usedCount;
  const sessionDone = bookedCount >= remainingUses;
  const currentNumber = pkg.usedCount + bookedCount + 1;
  const strippedPhone = pkg.customerPhone ? stripPhone(pkg.customerPhone) : '';

  const isValid = serviceId.length > 0 && date.length > 0 && TIME_REGEX.test(time);

  function handleTimeChange(e: ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 4);
    setTime(digits.length > 2 ? digits.slice(0, 2) + ':' + digits.slice(2) : digits);
    if (timeError) setTimeError('');
  }

  function handleBook() {
    if (!isValid) return;
    createBooking.mutate({
      serviceId,
      date,
      startTime: time,
      customerName: pkg.customerName,
      ...(strippedPhone.length >= 10 ? { customerPhone: strippedPhone } : {}),
      packageId: pkg.id,
    }, {
      onSuccess: () => {
        const next = bookedCount + 1;
        if (next >= remainingUses) {
          queryClient.invalidateQueries({ queryKey: ['admin-packages-all'] });
          onClose();
        } else {
          setBookedCount(next);
          setServiceId('');
          setDate('');
          setTime('');
          setTimeError('');
        }
      },
    });
  }

  function handleClose() {
    if (bookedCount > 0) {
      queryClient.invalidateQueries({ queryKey: ['admin-packages-all'] });
    }
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-dark-surface border border-dark-border rounded-2xl w-full max-w-sm max-h-[90dvh] overflow-hidden flex flex-col">
        <div className="overflow-y-auto p-6">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-serif text-base tracking-widest uppercase text-gold">Agendar</h2>
            <button
              onClick={handleClose}
              className="text-muted hover:text-[#F0EDE8] transition-colors bg-transparent border-none cursor-pointer text-lg leading-none"
            >
              ×
            </button>
          </div>
          <p className="text-muted text-xs mb-5">
            {pkg.customerName} — {sessionDone ? remainingUses : currentNumber - 1}/{pkg.totalUses} agendados
          </p>

          <div className="mb-5">
            <label className="block text-[11px] tracking-[0.12em] uppercase text-muted mb-2">Serviço</label>
            <select
              value={serviceId}
              onChange={(e) => setServiceId(e.target.value)}
              className="w-full bg-dark border border-dark-border rounded-xl px-4 py-3 text-sm text-[#F0EDE8] outline-none focus:border-gold appearance-none"
            >
              <option value="">Selecione um serviço</option>
              {services?.map((s) => (
                <option key={s.id} value={s.id}>{s.icon} {s.name}</option>
              ))}
            </select>
          </div>

          <div className="mb-5">
            <label className="block text-[11px] tracking-[0.12em] uppercase text-muted mb-2">Data</label>
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
              onBlur={() => {
                if (time && !TIME_REGEX.test(time)) setTimeError('Formato inválido. Use HH:MM (ex: 09:00)');
                else setTimeError('');
              }}
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
            onClick={handleBook}
            disabled={!isValid || createBooking.isPending}
            loading={createBooking.isPending}
            className="w-full"
          >
            Agendar ({currentNumber}/{pkg.totalUses})
          </Button>

          {createBooking.isError && (
            <p className="text-red-400 text-xs text-center mt-2">{(createBooking.error as Error)?.message}</p>
          )}
        </div>
      </div>
    </div>
  );
}
