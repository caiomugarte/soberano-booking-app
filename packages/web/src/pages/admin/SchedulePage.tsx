import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useShifts, useUpdateShifts, useAbsences, useAddAbsence, useDeleteAbsence,
  type Shift,
} from '../../api/use-schedule.ts';
import { Button } from '../../components/ui/Button.tsx';
import { Spinner } from '../../components/ui/Spinner.tsx';

const DAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const WORK_DAYS = [1, 2, 3, 4, 5, 6];

function ShiftRow({
  shift,
  onRemove,
}: {
  shift: Shift;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-3 py-2">
      <span className="w-8 text-xs text-muted text-center">{DAY_LABELS[shift.dayOfWeek]}</span>
      <span className="bg-dark-surface2 border border-dark-border rounded-lg px-3 py-1.5 text-sm font-mono">
        {shift.startTime}
      </span>
      <span className="text-muted text-xs">até</span>
      <span className="bg-dark-surface2 border border-dark-border rounded-lg px-3 py-1.5 text-sm font-mono">
        {shift.endTime}
      </span>
      <button
        onClick={onRemove}
        className="ml-auto text-muted hover:text-red-400 transition-colors text-lg leading-none cursor-pointer bg-transparent border-none"
      >
        ×
      </button>
    </div>
  );
}

export default function SchedulePage() {
  const navigate = useNavigate();
  const { data: savedShifts, isLoading: loadingShifts } = useShifts();
  const { data: absences, isLoading: loadingAbsences } = useAbsences();
  const updateShifts = useUpdateShifts();
  const addAbsence = useAddAbsence();
  const deleteAbsence = useDeleteAbsence();

  const [shifts, setShifts] = useState<Shift[]>([]);
  const [initialized, setInitialized] = useState(false);

  // Initialize local state from server on first load
  if (savedShifts && !initialized) {
    setShifts(savedShifts);
    setInitialized(true);
  }

  // New shift form
  const [newDay, setNewDay] = useState(1);
  const [newStart, setNewStart] = useState('09:00');
  const [newEnd, setNewEnd] = useState('12:00');

  // New absence form
  const [absDate, setAbsDate] = useState('');
  const [absStart, setAbsStart] = useState('');
  const [absEnd, setAbsEnd] = useState('');
  const [absReason, setAbsReason] = useState('');
  const [absFullDay, setAbsFullDay] = useState(true);

  function addShift() {
    if (newStart >= newEnd) return;
    setShifts((prev) => [...prev, { dayOfWeek: newDay, startTime: newStart, endTime: newEnd }]);
  }

  function removeShift(index: number) {
    setShifts((prev) => prev.filter((_, i) => i !== index));
  }

  async function saveShifts() {
    await updateShifts.mutateAsync(
      shifts.map(({ dayOfWeek, startTime, endTime }) => ({ dayOfWeek, startTime, endTime }))
    );
  }

  async function handleAddAbsence() {
    if (!absDate) return;
    await addAbsence.mutateAsync({
      date: absDate,
      startTime: absFullDay ? undefined : absStart || undefined,
      endTime: absFullDay ? undefined : absEnd || undefined,
      reason: absReason || undefined,
    });
    setAbsDate('');
    setAbsStart('');
    setAbsEnd('');
    setAbsReason('');
  }

  // Group shifts by day for display
  const shiftsByDay = WORK_DAYS.reduce<Record<number, { shift: Shift; index: number }[]>>(
    (acc, day) => {
      acc[day] = shifts
        .map((s, i) => ({ shift: s, index: i }))
        .filter(({ shift }) => shift.dayOfWeek === day);
      return acc;
    },
    {},
  );

  return (
    <div className="relative z-10 max-w-[680px] mx-auto px-5 py-8 pb-20">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={() => navigate('/admin')}
          className="text-muted hover:text-[#F0EDE8] transition-colors cursor-pointer bg-transparent border-none text-lg"
        >
          ←
        </button>
        <h1 className="font-serif text-2xl font-bold">Minha <em className="not-italic text-gold">Agenda</em></h1>
      </div>

      {/* Shifts section */}
      <section className="bg-dark-surface border border-dark-border rounded-2xl p-6 mb-5">
        <h2 className="font-serif text-lg font-bold mb-4">Horários de trabalho</h2>

        {loadingShifts ? (
          <div className="flex items-center gap-2 text-muted py-4"><Spinner /> Carregando...</div>
        ) : (
          <div className="mb-5">
            {WORK_DAYS.map((day) => (
              <div key={day}>
                {shiftsByDay[day].length > 0 && (
                  <div className="border-b border-dark-border last:border-0">
                    {shiftsByDay[day].map(({ shift, index }) => (
                      <ShiftRow key={index} shift={shift} onRemove={() => removeShift(index)} />
                    ))}
                  </div>
                )}
              </div>
            ))}
            {shifts.length === 0 && (
              <p className="text-muted text-sm py-3">Nenhum horário cadastrado.</p>
            )}
          </div>
        )}

        {/* Add shift form */}
        <div className="bg-dark-surface2 border border-dark-border rounded-xl p-4 mb-4">
          <p className="text-xs tracking-widest uppercase text-muted mb-3">Adicionar turno</p>
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={newDay}
              onChange={(e) => setNewDay(Number(e.target.value))}
              className="bg-dark border border-dark-border rounded-lg px-3 py-2 text-sm text-[#F0EDE8] outline-none focus:border-gold"
            >
              {WORK_DAYS.map((d) => (
                <option key={d} value={d}>{DAY_LABELS[d]}</option>
              ))}
            </select>
            <input
              type="time"
              value={newStart}
              onChange={(e) => setNewStart(e.target.value)}
              className="bg-dark border border-dark-border rounded-lg px-3 py-2 text-sm text-[#F0EDE8] outline-none focus:border-gold"
            />
            <span className="text-muted text-xs">até</span>
            <input
              type="time"
              value={newEnd}
              onChange={(e) => setNewEnd(e.target.value)}
              className="bg-dark border border-dark-border rounded-lg px-3 py-2 text-sm text-[#F0EDE8] outline-none focus:border-gold"
            />
            <button
              onClick={addShift}
              disabled={newStart >= newEnd}
              className="px-4 py-2 bg-gold/10 border border-gold/30 text-gold rounded-lg text-sm hover:bg-gold/20 transition-colors disabled:opacity-40 cursor-pointer"
            >
              + Adicionar
            </button>
          </div>
        </div>

        {updateShifts.isError && (
          <p className="text-red-400 text-sm mb-3">{(updateShifts.error as Error).message}</p>
        )}
        {updateShifts.isSuccess && (
          <p className="text-green-400 text-sm mb-3">Horários salvos!</p>
        )}
        <Button loading={updateShifts.isPending} onClick={saveShifts}>
          Salvar horários
        </Button>
      </section>

      {/* Absences section */}
      <section className="bg-dark-surface border border-dark-border rounded-2xl p-6">
        <h2 className="font-serif text-lg font-bold mb-4">Ausências</h2>

        {loadingAbsences ? (
          <div className="flex items-center gap-2 text-muted py-4"><Spinner /> Carregando...</div>
        ) : absences?.length ? (
          <div className="mb-5 space-y-2">
            {absences.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-3 py-2.5 border-b border-dark-border last:border-0">
                <div>
                  <p className="text-sm font-medium">
                    {new Date(a.date.slice(0, 10) + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                    {a.startTime && a.endTime ? ` — ${a.startTime} às ${a.endTime}` : ' — Dia inteiro'}
                  </p>
                  {a.reason && <p className="text-xs text-muted">{a.reason}</p>}
                </div>
                <button
                  onClick={() => deleteAbsence.mutate(a.id)}
                  className="text-muted hover:text-red-400 transition-colors cursor-pointer bg-transparent border-none text-lg leading-none"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted text-sm mb-5">Nenhuma ausência cadastrada.</p>
        )}

        {/* Add absence form */}
        <div className="bg-dark-surface2 border border-dark-border rounded-xl p-4">
          <p className="text-xs tracking-widest uppercase text-muted mb-3">Registrar ausência</p>
          <div className="flex flex-col gap-3">
            <input
              type="date"
              value={absDate}
              onChange={(e) => setAbsDate(e.target.value)}
              className="bg-dark border border-dark-border rounded-lg px-3 py-2 text-sm text-[#F0EDE8] outline-none focus:border-gold"
            />
            <label className="flex items-center gap-2 text-sm text-muted cursor-pointer">
              <input
                type="checkbox"
                checked={absFullDay}
                onChange={(e) => setAbsFullDay(e.target.checked)}
                className="accent-gold"
              />
              Dia inteiro
            </label>
            {!absFullDay && (
              <div className="flex items-center gap-2">
                <input type="time" value={absStart} onChange={(e) => setAbsStart(e.target.value)}
                  className="bg-dark border border-dark-border rounded-lg px-3 py-2 text-sm text-[#F0EDE8] outline-none focus:border-gold" />
                <span className="text-muted text-xs">até</span>
                <input type="time" value={absEnd} onChange={(e) => setAbsEnd(e.target.value)}
                  className="bg-dark border border-dark-border rounded-lg px-3 py-2 text-sm text-[#F0EDE8] outline-none focus:border-gold" />
              </div>
            )}
            <input
              type="text"
              placeholder="Motivo (opcional)"
              value={absReason}
              onChange={(e) => setAbsReason(e.target.value)}
              className="bg-dark border border-dark-border rounded-lg px-3 py-2 text-sm text-[#F0EDE8] placeholder-muted outline-none focus:border-gold"
            />
            <Button loading={addAbsence.isPending} disabled={!absDate} onClick={handleAddAbsence}>
              Registrar ausência
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
