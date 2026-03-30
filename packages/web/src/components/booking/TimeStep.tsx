import { useState, useEffect } from 'react';
import { useSlots, type Slot } from '../../api/use-slots.ts';
import { useBookingStore } from '../../stores/booking.store.ts';
import { Panel } from '../ui/Panel.tsx';
import { StickyBar } from '../ui/StickyBar.tsx';
import { Spinner } from '../ui/Spinner.tsx';
import { getWeekDates, getWeekLabel, dateToString, DAY_NAMES, formatDateLong } from '../../lib/format.ts';
import { MAX_WEEKS_AHEAD } from '@soberano/shared';

export function TimeStep() {
  const [weekOffset, setWeekOffset] = useState(0);
  const { barber, date, slot, setDate, setSlot, nextStep, prevStep } = useBookingStore();
  const { data: slots, isLoading: loadingSlots } = useSlots(barber?.id ?? null, date);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekDates = getWeekDates(weekOffset);

  useEffect(() => {
    if (!date) {
      const d = new Date(today);
      setDate(dateToString(d));
    }
  }, []);

  return (
    <>
    <Panel title="Escolha o horário" subtitle="Selecione uma data e horário disponível">
      {/* Week navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setWeekOffset((w) => Math.max(0, w - 1))}
          disabled={weekOffset === 0}
          className="w-[34px] h-[34px] bg-dark-surface2 border border-dark-border rounded-lg flex items-center justify-center text-base hover:border-gold hover:text-gold transition-all disabled:opacity-30"
        >
          ‹
        </button>
        <span className="text-base font-semibold">{getWeekLabel(weekDates)}</span>
        <button
          onClick={() => setWeekOffset((w) => Math.min(MAX_WEEKS_AHEAD - 1, w + 1))}
          disabled={weekOffset >= MAX_WEEKS_AHEAD - 1}
          className="w-[34px] h-[34px] bg-dark-surface2 border border-dark-border rounded-lg flex items-center justify-center text-base hover:border-gold hover:text-gold transition-all disabled:opacity-30"
        >
          ›
        </button>
      </div>

      {/* Days row */}
      <div className="grid grid-cols-7 gap-1.5 mb-6">
        {weekDates.map((d) => {
          const disabled = d < today;
          const ds = dateToString(d);
          const isSelected = date === ds;
          return (
            <button
              key={ds}
              disabled={disabled}
              onClick={() => setDate(ds)}
              className={`flex flex-col items-center gap-1 py-2.5 px-1 rounded-[10px] border transition-all duration-200
                ${disabled ? 'opacity-30 cursor-not-allowed border-dark-border bg-dark-surface2' : 'cursor-pointer'}
                ${isSelected ? 'border-gold bg-gold/[0.08]' : !disabled ? 'border-dark-border bg-dark-surface2 hover:border-gold/40' : ''}
              `}
            >
              <span className="text-[9px] tracking-[0.1em] uppercase text-muted">{DAY_NAMES[d.getDay()]}</span>
              <span className="text-lg font-semibold">{d.getDate()}</span>
              {!disabled ? <span className="w-1 h-1 rounded-full bg-gold" /> : <span className="w-1 h-1" />}
            </button>
          );
        })}
      </div>

      {/* Slots */}
      <p className="text-[12px] tracking-[0.1em] uppercase text-muted mb-3">Horários disponíveis</p>
      {!date ? (
        <p className="text-center py-5 text-muted text-sm">Selecione uma data acima</p>
      ) : loadingSlots ? (
        <div className="flex items-center justify-center py-5 gap-2 text-muted text-sm">
          <Spinner /> Buscando horários...
        </div>
      ) : !slots?.length ? (
        <p className="text-center py-5 text-muted text-sm">Sem horários disponíveis neste dia</p>
      ) : (
        <div className="grid grid-cols-5 gap-2 max-[500px]:grid-cols-4">
          {slots.map((s: Slot) => (
            <button
              key={s.time}
              onClick={() => s.available && setSlot(s.time)}
              disabled={!s.available}
              className={`py-2.5 px-1.5 rounded-lg border text-base font-medium text-center transition-all duration-200
                ${!s.available
                  ? 'border-dark-border bg-dark-surface2 text-muted/40 cursor-not-allowed line-through'
                  : slot === s.time
                    ? 'border-gold bg-gold/[0.08] text-gold cursor-pointer'
                    : 'border-dark-border bg-dark-surface2 hover:border-gold/40 cursor-pointer'}
              `}
            >
              {s.time}
            </button>
          ))}
        </div>
      )}

    </Panel>

    <StickyBar
      visible={!!slot}
      onNext={nextStep}
      onBack={prevStep}
      icon="📅"
      label={slot ?? ''}
      sublabel={date ? formatDateLong(date) : undefined}
    />
    </>
  );
}
