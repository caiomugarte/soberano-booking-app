import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppointment, useCancelAppointment, useChangeAppointment } from '../../api/use-appointment.ts';
import { useSlots, type Slot } from '../../api/use-slots.ts';
import { Button } from '../ui/Button.tsx';
import { Input } from '../ui/Input.tsx';
import { Spinner } from '../ui/Spinner.tsx';
import { formatCurrency, formatDateLong, getWeekDates, getWeekLabel, dateToString, DAY_NAMES } from '../../lib/format.ts';
import { MAX_WEEKS_AHEAD } from '@soberano/shared';

type View = 'detail' | 'cancel' | 'change';

export function AppointmentView({ token }: { token: string }) {
  const navigate = useNavigate();
  const { data: appointment, isLoading, isError } = useAppointment(token);
  const cancelMutation = useCancelAppointment(token);
  const changeMutation = useChangeAppointment(token, (newToken) => {
    navigate(`/agendamento/${newToken}`, { replace: true });
  });

  const [view, setView] = useState<View>('detail');
  const [phone, setPhone] = useState('');

  // Change state
  const [weekOffset, setWeekOffset] = useState(0);
  const [newDate, setNewDate] = useState<string | null>(null);
  const [newSlot, setNewSlot] = useState<string | null>(null);
  const { data: slots, isLoading: loadingSlots } = useSlots(
    appointment?.barberId ?? null,
    newDate,
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 gap-3 text-muted">
        <Spinner /> Carregando agendamento...
      </div>
    );
  }

  if (isError || !appointment) {
    return (
      <div className="text-center py-20">
        <p className="text-muted text-lg">Agendamento não encontrado.</p>
      </div>
    );
  }

  const isCancelled = appointment.status === 'cancelled';
  const isCompleted = appointment.status === 'completed';
  const phoneValid = phone.length === 4 && appointment.customer.phoneLast4 === phone;

  // Cancel flow
  if (view === 'cancel') {
    if (cancelMutation.isSuccess) {
      return (
        <div className="text-center py-20 animate-[fadeUp_0.5s_ease]">
          <div className="w-18 h-18 rounded-full bg-gold/10 border-2 border-gold flex items-center justify-center text-[28px] mx-auto mb-6">✓</div>
          <h2 className="text-3xl font-black mb-3">Agendamento cancelado</h2>
          <p className="text-muted text-sm mb-6">Esperamos te ver em breve!</p>
          <a href="/" className="inline-block bg-gold text-dark font-bold text-[14px] px-8 py-3 rounded-lg hover:opacity-90 transition-opacity">
            Fazer novo agendamento
          </a>
        </div>
      );
    }

    return (
      <div className="bg-dark-surface border border-dark-border rounded-2xl p-7 mb-5">
        <h2 className="text-[22px] font-bold mb-1.5">Cancelar agendamento</h2>
        <p className="text-[13px] text-muted mb-5">Confirme os 4 últimos dígitos do seu telefone para cancelar.</p>
        <Input
          label="Últimos 4 dígitos do WhatsApp"
          placeholder="9999"
          value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 4))}
          inputMode="numeric"
          maxLength={4}
        />
        {cancelMutation.isError && (
          <p className="text-red-400 text-sm mb-4">{(cancelMutation.error as Error).message}</p>
        )}
        <Button
          loading={cancelMutation.isPending}
          disabled={!phoneValid}
          onClick={() => cancelMutation.mutate(phone)}
          className="bg-red-600 hover:bg-red-500"
        >
          Confirmar cancelamento
        </Button>
        <Button variant="secondary" onClick={() => setView('detail')}>← Voltar</Button>
      </div>
    );
  }

  // Change flow
  if (view === 'change') {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const weekDates = getWeekDates(weekOffset);

    if (changeMutation.isSuccess) {
      return (
        <div className="text-center py-20 animate-[fadeUp_0.5s_ease]">
          <div className="w-18 h-18 rounded-full bg-gold/10 border-2 border-gold flex items-center justify-center text-[28px] mx-auto mb-6">✓</div>
          <h2 className="text-3xl font-black mb-3">Horário alterado!</h2>
          <p className="text-muted text-sm">Você receberá uma confirmação no WhatsApp.</p>
        </div>
      );
    }

    return (
      <div className="bg-dark-surface border border-dark-border rounded-2xl p-7 mb-5">
        <h2 className="text-[22px] font-bold mb-1.5">Alterar horário</h2>
        <p className="text-[13px] text-muted mb-5">Escolha uma nova data e horário.</p>

        {!phoneValid ? (
          <Input
            label="Últimos 4 dígitos do WhatsApp"
            placeholder="9999"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 4))}
            inputMode="numeric"
            maxLength={4}
          />
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setWeekOffset((w) => Math.max(0, w - 1))} disabled={weekOffset === 0} className="w-[34px] h-[34px] bg-dark-surface2 border border-dark-border rounded-lg flex items-center justify-center hover:border-gold hover:text-gold transition-all disabled:opacity-30">‹</button>
              <span className="text-base font-bold">{getWeekLabel(weekDates)}</span>
              <button onClick={() => setWeekOffset((w) => Math.min(MAX_WEEKS_AHEAD - 1, w + 1))} disabled={weekOffset >= MAX_WEEKS_AHEAD - 1} className="w-[34px] h-[34px] bg-dark-surface2 border border-dark-border rounded-lg flex items-center justify-center hover:border-gold hover:text-gold transition-all disabled:opacity-30">›</button>
            </div>
            <div className="grid grid-cols-7 gap-1.5 mb-6">
              {weekDates.map((d) => {
                const disabled = d < today;
                const ds = dateToString(d);
                return (
                  <button key={ds} disabled={disabled} onClick={() => { setNewDate(ds); setNewSlot(null); }}
                    className={`flex flex-col items-center gap-1 py-2.5 px-1 rounded-[10px] border transition-all duration-200 ${disabled ? 'opacity-30 cursor-not-allowed border-dark-border bg-dark-surface2' : 'cursor-pointer'} ${newDate === ds ? 'border-gold bg-gold/[0.08]' : !disabled ? 'border-dark-border bg-dark-surface2 hover:border-gold/40' : ''}`}>
                    <span className="text-[9px] tracking-[0.1em] uppercase text-muted">{DAY_NAMES[d.getDay()]}</span>
                    <span className="text-lg font-bold">{d.getDate()}</span>
                    {!disabled ? <span className="w-1 h-1 rounded-full bg-gold" /> : <span className="w-1 h-1" />}
                  </button>
                );
              })}
            </div>
            {newDate && (loadingSlots ? (
              <div className="flex items-center gap-2 text-muted text-sm py-3"><Spinner /> Buscando horários...</div>
            ) : (
              <div className="grid grid-cols-5 gap-2 mb-4">
                {(slots ?? []).map((s: Slot) => (
                  <button key={s.time} onClick={() => s.available && setNewSlot(s.time)}
                    disabled={!s.available}
                    className={`py-2.5 px-1.5 rounded-lg border text-[13px] font-medium text-center transition-all
                      ${!s.available
                        ? 'border-dark-border bg-dark-surface2 text-muted/40 cursor-not-allowed line-through'
                        : newSlot === s.time
                          ? 'border-gold bg-gold/[0.08] text-gold cursor-pointer'
                          : 'border-dark-border bg-dark-surface2 hover:border-gold/40 cursor-pointer'}`}>
                    {s.time}
                  </button>
                ))}
              </div>
            ))}
          </>
        )}

        {changeMutation.isError && (
          <p className="text-red-400 text-sm mb-4">{(changeMutation.error as Error).message}</p>
        )}
        <Button
          loading={changeMutation.isPending}
          disabled={!phoneValid || !newDate || !newSlot}
          onClick={() => changeMutation.mutate({ phoneLastFour: phone, date: newDate!, startTime: newSlot! })}
        >
          Confirmar alteração
        </Button>
        <Button variant="secondary" onClick={() => setView('detail')}>← Voltar</Button>
      </div>
    );
  }

  // Detail view
  return (
    <div className="bg-dark-surface border border-dark-border rounded-2xl p-7 mb-5 animate-[fadeUp_0.4s_ease]">
      <div className="flex items-center gap-3 mb-5">
        <div className="text-2xl">{appointment.service.icon}</div>
        <div>
          <h2 className="text-xl font-bold">{appointment.service.name}</h2>
          <p className="text-muted text-sm">{appointment.barber.firstName} {appointment.barber.lastName}</p>
        </div>
      </div>

      {[
        { key: 'Data', value: formatDateLong(typeof appointment.date === 'string' ? appointment.date.split('T')[0] : appointment.date) },
        { key: 'Horário', value: appointment.startTime },
        { key: 'Valor', value: formatCurrency(appointment.priceCents), gold: true },
        { key: 'Status', value: appointment.status === 'confirmed' ? '✅ Confirmado' : appointment.status === 'cancelled' ? '❌ Cancelado' : '✓ Concluído' },
      ].map(({ key, value, gold }) => (
        <div key={key} className="flex justify-between items-start py-2.5 text-sm gap-3 border-b border-dark-border last:border-0">
          <span className="text-muted">{key}</span>
          <span className={`font-medium text-right ${gold ? 'text-gold text-base' : ''}`}>{value}</span>
        </div>
      ))}

      {!isCancelled && !isCompleted && (
        <div className="flex flex-col gap-3 mt-6">
          <Button onClick={() => setView('change')}>Alterar horário</Button>
          <button onClick={() => setView('cancel')} className="text-sm text-muted hover:text-red-400 transition-colors py-2 cursor-pointer bg-transparent border-none">
            Cancelar agendamento
          </button>
        </div>
      )}
    </div>
  );
}
