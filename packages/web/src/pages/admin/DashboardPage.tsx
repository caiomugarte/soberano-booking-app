import {useEffect, useRef, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {
  type AdminAppointment,
  type DayStat,
  useAdminAppointments,
  useAdminAppointmentsRange,
  useAdminCancelAppointment,
  useAdminMe,
  useAdminStats,
  useUpdateAppointmentStatus
} from '../../api/use-admin.ts';
import {useAuthStore} from '../../stores/auth.store.ts';
import {queryClient} from '../../config/query-client.ts';
import {Button} from '../../components/ui/Button.tsx';
import {AdminBookingModal} from '../../components/admin/AdminBookingModal.tsx';
import {Spinner} from '../../components/ui/Spinner.tsx';
import {
  dateToString,
  DAY_NAMES,
  formatCurrency,
  getAdminWeekDates,
  getMonthCalendarDays,
  getMonthLabel,
  getWeekLabel,
  getYearLabel,
  MONTH_NAMES,
} from '../../lib/format.ts';

const STATUS_LABEL: Record<string, string> = {
  confirmed: 'Confirmado',
  completed: 'Concluído',
  no_show: 'Não compareceu',
  cancelled: 'Cancelado',
};

const STATUS_COLOR: Record<string, string> = {
  confirmed: 'text-gold border-gold/30 bg-gold/10',
  completed: 'text-green-400 border-green-400/30 bg-green-400/10',
  no_show: 'text-red-400 border-red-400/30 bg-red-400/10',
  cancelled: 'text-muted border-dark-border bg-dark-surface2',
};

function BarberProfile({
  barber,
  onLogout,
  onAgenda,
}: {
  barber: { firstName: string; lastName: string; avatarUrl: string | null };
  onLogout: () => void;
  onAgenda: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [imgError, setImgError] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const initials = barber.firstName[0] + barber.lastName[0];
  const showPhoto = barber.avatarUrl && !imgError;

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 cursor-pointer bg-transparent border-none"
      >
        <span className="text-xs text-muted">{barber.firstName} {barber.lastName}</span>
        {showPhoto ? (
          <img
            src={barber.avatarUrl!}
            alt={`${barber.firstName} ${barber.lastName}`}
            onError={() => setImgError(true)}
            className="w-7 h-7 rounded-full object-cover border border-dark-border"
            style={{objectPosition: 'center 30%' }}
          />
        ) : (
          <div className="w-7 h-7 rounded-full bg-dark-border flex items-center justify-center text-xs font-bold">
            {initials}
          </div>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-36 bg-dark-surface border border-dark-border rounded-xl py-1 shadow-lg z-50">
          <button
            onClick={() => { setOpen(false); onAgenda(); }}
            className="w-full text-left px-4 py-2 text-xs text-muted hover:text-[#F0EDE8] hover:bg-dark-surface2 transition-colors cursor-pointer bg-transparent border-none"
          >
            Agenda
          </button>
          <div className="mx-3 border-t border-dark-border" />
          <button
            onClick={() => { setOpen(false); onLogout(); }}
            className="w-full text-left px-4 py-2 text-xs text-muted hover:text-[#F0EDE8] hover:bg-dark-surface2 transition-colors cursor-pointer bg-transparent border-none"
          >
            Sair
          </button>
        </div>
      )}
    </div>
  );
}

function AppointmentCard({
  appointment,
  timePassed,
  onCancelClick,
  onNoShowClick,
}: {
  appointment: AdminAppointment;
  timePassed: boolean;
  onCancelClick: (id: string) => void;
  onNoShowClick: (id: string) => void;
}) {
  const updateStatus = useUpdateAppointmentStatus();
  const isConfirmed = appointment.status === 'confirmed';
  const isCompleted = appointment.status === 'completed';
  const isNoShow = appointment.status === 'no_show';

  return (
    <div className={`bg-dark-surface border rounded-xl p-5 transition-opacity ${appointment.status === 'cancelled' ? 'opacity-50' : ''} border-dark-border`}>
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">{appointment.service.icon}</span>
            <span className="font-bold text-base">{appointment.service.name}</span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${STATUS_COLOR[appointment.status]}`}>
              {STATUS_LABEL[appointment.status] ?? appointment.status}
            </span>
          </div>
          <p className="text-muted text-sm">{appointment.customer.name}</p>
          {appointment.customer.phone && <p className="text-muted text-xs">+55 {appointment.customer.phone}</p>}
        </div>
        <div className="text-right shrink-0">
          <p className="text-gold text-lg font-bold">{appointment.startTime}</p>
          <p className="text-muted text-xs">até {appointment.endTime}</p>
          <p className="text-sm font-medium mt-1">{formatCurrency(appointment.priceCents)}</p>
        </div>
      </div>

      {isConfirmed && (
        <div className="flex gap-1.5">
          <button
            onClick={() => updateStatus.mutate({ id: appointment.id, status: 'completed' })}
            disabled={updateStatus.isPending || !timePassed}
            className="flex-1 py-2 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500/20 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed text-xs font-medium"
          >
            ✓ Concluído
          </button>
          <button
            onClick={() => onNoShowClick(appointment.id)}
            disabled={updateStatus.isPending || !timePassed}
            className="flex-1 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed text-xs font-medium"
          >
            ✗ Não veio
          </button>
          {!timePassed && (
            <button
              onClick={() => onCancelClick(appointment.id)}
              disabled={updateStatus.isPending}
              className="flex-1 py-2 rounded-lg bg-orange-500/10 border border-orange-500/30 text-orange-400 hover:bg-orange-500/20 transition-colors cursor-pointer disabled:opacity-50 text-xs font-medium"
            >
              ✕ Cancelar
            </button>
          )}
        </div>
      )}

      {(isCompleted || isNoShow) && (
        <div className="flex gap-1.5">
          <span className="text-xs text-muted self-center mr-1">Corrigir:</span>
          {isCompleted && (
            <button
              onClick={() => updateStatus.mutate({ id: appointment.id, status: 'no_show' })}
              disabled={updateStatus.isPending}
              className="py-1.5 px-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed text-xs font-medium"
            >
              ✗ Não veio
            </button>
          )}
          {isNoShow && (
            <button
              onClick={() => updateStatus.mutate({ id: appointment.id, status: 'completed' })}
              disabled={updateStatus.isPending}
              className="py-1.5 px-3 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500/20 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed text-xs font-medium"
            >
              ✓ Concluído
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function CancelModal({
  onConfirm,
  onClose,
  isPending,
}: {
  onConfirm: (reason: string) => void;
  onClose: () => void;
  isPending: boolean;
}) {
  const [reason, setReason] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-dark-surface border border-dark-border rounded-2xl p-6 w-full max-w-sm">
        <h3 className="text-lg font-bold mb-1">Cancelar agendamento</h3>
        <p className="text-muted text-sm mb-4">O cliente receberá uma mensagem no WhatsApp com o motivo.</p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Motivo do cancelamento..."
          rows={3}
          className="w-full bg-dark border border-dark-border rounded-xl px-4 py-3 text-sm text-[#F0EDE8] placeholder-muted outline-none focus:border-gold resize-none mb-4"
        />
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isPending}
            className="flex-1 py-2.5 rounded-xl border border-dark-border text-muted hover:text-[#F0EDE8] transition-colors text-sm cursor-pointer bg-transparent disabled:opacity-50"
          >
            Voltar
          </button>
          <Button
            onClick={() => onConfirm(reason)}
            disabled={!reason.trim()}
            loading={isPending}
            className="flex-1"
          >
            Confirmar cancelamento
          </Button>
        </div>
      </div>
    </div>
  );
}

function StatsSummary({ days }: { days: DayStat[] }) {
  const total = days.reduce((acc, d) => ({
    confirmed: acc.confirmed + d.confirmed,
    completed: acc.completed + d.completed,
    revenueCents: acc.revenueCents + d.revenueCents,
  }), { confirmed: 0, completed: 0, revenueCents: 0 });

  return (
    <div className="grid grid-cols-3 gap-3 mb-6">
      {[
        { label: 'Agendados', value: total.confirmed, color: 'text-gold' },
        { label: 'Concluídos', value: total.completed, color: 'text-green-400' },
        { label: 'Faturamento', value: formatCurrency(total.revenueCents), color: 'text-gold' },
      ].map(({ label, value, color }) => (
        <div key={label} className="bg-dark-surface border border-dark-border rounded-xl p-4 text-center">
          <p className={`text-base font-bold ${color}`}>{value}</p>
          <p className="text-muted text-xs mt-1">{label}</p>
        </div>
      ))}
    </div>
  );
}

const HOUR_HEIGHT = 72; // px per hour
const START_HOUR = 7;
const END_HOUR = 21;
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);

const APPT_COLORS: Record<string, string> = {
  confirmed: 'bg-gold/20 border-gold/50 text-gold',
  completed: 'bg-green-500/20 border-green-500/50 text-green-400',
  no_show: 'bg-red-500/15 border-red-500/40 text-red-400 opacity-60',
};

function timeToMinutes(t: string) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function WeekView({ onSelectDay }: { onSelectDay: (date: string) => void }) {
  const [weekOffset, setWeekOffset] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const dates = getAdminWeekDates(weekOffset);
  const from = dateToString(dates[0]);
  const to = dateToString(dates[6]);
  const { data: appointments, isLoading } = useAdminAppointmentsRange(from, to);
  const today = dateToString(new Date());
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  // Group appointments by date — exclude cancelled
  const byDay = new Map<string, AdminAppointment[]>();
  (appointments ?? []).filter((a) => a.status !== 'cancelled').forEach((a) => {
    const ds = a.date.slice(0, 10);
    if (!byDay.has(ds)) byDay.set(ds, []);
    byDay.get(ds)!.push(a);
  });

  // Derive week summary from fetched appointments
  const weekStats = (appointments ?? []).reduce(
    (acc, a) => ({
      confirmed: acc.confirmed + (a.status === 'confirmed' ? 1 : 0),
      completed: acc.completed + (a.status === 'completed' ? 1 : 0),
      revenueCents: acc.revenueCents + (a.status === 'completed' ? a.priceCents : 0),
    }),
    { confirmed: 0, completed: 0, revenueCents: 0 },
  );

  // Scroll to current time (or 8am) on mount / week change
  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = weekOffset === 0
        ? Math.max(0, (currentMinutes - START_HOUR * 60 - 60) / 60 * HOUR_HEIGHT)
        : (8 - START_HOUR) * HOUR_HEIGHT;
  }, [weekOffset]);

  const totalHeight = (END_HOUR - START_HOUR) * HOUR_HEIGHT;

  return (
    <div>
      {/* Navigation */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setWeekOffset((w) => w - 1)}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-dark-border text-muted hover:border-gold/40 hover:text-gold transition-all cursor-pointer bg-transparent"
        >‹</button>
        <span className="text-sm font-semibold">{getWeekLabel(dates)}</span>
        <button onClick={() => setWeekOffset((w) => w + 1)}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-dark-border text-muted hover:border-gold/40 hover:text-gold transition-all cursor-pointer bg-transparent"
        >›</button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-10 gap-2 text-muted"><Spinner /> Carregando...</div>
      ) : (
        <>
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { label: 'Agendados', value: weekStats.confirmed, color: 'text-gold' },
            { label: 'Concluídos', value: weekStats.completed, color: 'text-green-400' },
            { label: 'Faturamento', value: formatCurrency(weekStats.revenueCents), color: 'text-gold' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-dark-surface border border-dark-border rounded-xl p-4 text-center">
              <p className={`text-base font-bold ${color}`}>{value}</p>
              <p className="text-muted text-xs mt-1">{label}</p>
            </div>
          ))}
        </div>
        <div className="border border-dark-border rounded-xl overflow-hidden">
          {/* Horizontally scrollable on mobile */}
          <div className="overflow-x-auto">
          <div style={{ minWidth: 480 }}>
          {/* Day headers */}
          <div className="grid border-b border-dark-border bg-dark-surface overflow-y-scroll" style={{ gridTemplateColumns: '36px repeat(7, 1fr)', scrollbarGutter: 'stable' }}>
            <div className="border-r border-dark-border" />
            {dates.map((d) => {
              const ds = dateToString(d);
              const isToday = ds === today;
              return (
                <button
                  key={ds}
                  onClick={() => onSelectDay(ds)}
                  className={`py-2 text-center border-r border-dark-border last:border-r-0 cursor-pointer hover:bg-dark-surface2 transition-colors
                    ${isToday ? 'bg-gold/5' : ''}`}
                >
                  <div className={`text-[10px] tracking-widest uppercase ${isToday ? 'text-gold' : 'text-muted'}`}>
                    {DAY_NAMES[d.getDay()]}
                  </div>
                  <div className={`text-sm font-bold ${isToday ? 'text-gold' : ''}`}>{d.getDate()}</div>
                </button>
              );
            })}
          </div>

          {/* Scrollable grid */}
          <div ref={scrollRef} className="overflow-y-scroll" style={{ maxHeight: '480px', scrollbarGutter: 'stable' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '36px repeat(7, 1fr)', height: totalHeight }}>

              {/* Time gutter */}
              <div className="relative border-r border-dark-border">
                {HOURS.map((h) => (
                  <div
                    key={h}
                    className="absolute text-[10px] text-muted text-right pr-1.5 select-none w-full"
                    style={{ top: (h - START_HOUR) * HOUR_HEIGHT - 6 }}
                  >
                    {h}h
                  </div>
                ))}
              </div>

              {/* Day columns — each is a real grid cell */}
              {dates.map((d) => {
                const ds = dateToString(d);
                const dayAppts = byDay.get(ds) ?? [];
                const isToday = ds === today;

                return (
                  <div
                    key={ds}
                    className={`relative border-r border-dark-border/40 last:border-r-0 ${isToday ? 'bg-gold/[0.02]' : ''}`}
                  >
                    {/* Hour lines */}
                    {HOURS.map((h) => (
                      <div
                        key={h}
                        className="absolute left-0 right-0 border-t border-dark-border/40"
                        style={{ top: (h - START_HOUR) * HOUR_HEIGHT }}
                      />
                    ))}

                    {/* Current time indicator */}
                    {isToday && currentMinutes >= START_HOUR * 60 && currentMinutes < END_HOUR * 60 && (
                      <div
                        className="absolute left-0 right-0 z-10 flex items-center"
                        style={{ top: (currentMinutes - START_HOUR * 60) / 60 * HOUR_HEIGHT }}
                      >
                        <div className="w-2 h-2 rounded-full bg-gold flex-shrink-0 -ml-1" />
                        <div className="flex-1 h-px bg-gold" />
                      </div>
                    )}

                    {/* Appointments */}
                    {dayAppts.map((a) => {
                      const startMin = timeToMinutes(a.startTime);
                      const endMin = timeToMinutes(a.endTime);
                      const top = Math.max(0, (startMin - START_HOUR * 60) / 60 * HOUR_HEIGHT);
                      const height = Math.max(22, (endMin - startMin) / 60 * HOUR_HEIGHT - 2);
                      const colorClass = APPT_COLORS[a.status] ?? APPT_COLORS.confirmed;
                      const isShort = height < 40;

                      return (
                        <button
                          key={a.id}
                          onClick={() => onSelectDay(ds)}
                          className={`absolute left-0.5 right-0.5 rounded border text-left overflow-hidden cursor-pointer transition-opacity hover:opacity-90 ${colorClass}`}
                          style={{ top, height }}
                        >
                          <div className="px-1.5 py-0.5 leading-tight">
                            <div className="text-[10px] font-bold truncate">{a.startTime}</div>
                            <div className="text-[10px] font-medium truncate">{(() => { const parts = a.customer.name.trim().split(/\s+/); return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : parts[0]; })()}</div>
                            {!isShort && <div className="text-[10px] truncate opacity-70">{a.service.name}</div>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
          </div>
          </div>
        </div>
        </>
      )}
    </div>
  );
}

const CAL_DAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

function MonthView({ onSelectDay, initialOffset = 0 }: { onSelectDay: (date: string) => void; initialOffset?: number }) {
  const [monthOffset, setMonthOffset] = useState(initialOffset);
  const calDays = getMonthCalendarDays(monthOffset);
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + monthOffset;
  const from = dateToString(new Date(year, month, 1));
  const to = dateToString(new Date(year, month + 1, 0));
  const { data: days, isLoading } = useAdminStats(from, to);
  const statsMap = new Map((days ?? []).map((d) => [d.date, d]));
  const todayStr = dateToString(today);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setMonthOffset((m) => m - 1)}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-dark-border text-muted hover:border-gold/40 hover:text-gold transition-all cursor-pointer bg-transparent"
        >‹</button>
        <span className="text-sm font-semibold">{getMonthLabel(monthOffset)}</span>
        <button
          onClick={() => setMonthOffset((m) => m + 1)}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-dark-border text-muted hover:border-gold/40 hover:text-gold transition-all cursor-pointer bg-transparent"
        >›</button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-10 gap-2 text-muted"><Spinner /> Carregando...</div>
      ) : (
        <>
          <StatsSummary days={days ?? []} />
          <div className="grid grid-cols-7 gap-1 mb-2">
            {CAL_DAYS.map((d) => (
              <div key={d} className="text-center text-[10px] tracking-widest uppercase text-muted py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {calDays.map((d, i) => {
              if (!d) return <div key={i} />;
              const ds = dateToString(d);
              const stat = statsMap.get(ds);
              const confirmed = stat?.confirmed ?? 0;
              const completed = stat?.completed ?? 0;
              const total = confirmed + completed;
              const isToday = ds === todayStr;
              return (
                <button
                  key={ds}
                  onClick={() => onSelectDay(ds)}
                  className={`flex flex-col items-center py-2 rounded-lg border transition-all cursor-pointer
                    ${isToday ? 'border-gold bg-gold/10' : total > 0 ? 'border-dark-border bg-dark-surface hover:border-gold/30' : 'border-transparent bg-transparent hover:border-dark-border'}`}
                >
                  <span className={`text-sm font-medium ${isToday ? 'text-gold' : ''}`}>{d.getDate()}</span>
                  {total > 0 ? (
                    <div className="flex gap-0.5 mt-0.5">
                      {confirmed > 0 && <span className="text-[10px] text-gold font-medium">{confirmed}</span>}
                      {confirmed > 0 && completed > 0 && <span className="text-[10px] text-muted">·</span>}
                      {completed > 0 && <span className="text-[10px] text-green-400 font-medium">{completed}</span>}
                    </div>
                  ) : (
                    <span className="h-[14px]" />
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function YearView({ onSelectMonth }: { onSelectMonth: (offset: number) => void }) {
  const [yearOffset, setYearOffset] = useState(0);
  const year = getYearLabel(yearOffset);
  const from = `${year}-01-01`;
  const to = `${year}-12-31`;
  const { data: days, isLoading } = useAdminStats(from, to);

  const byMonth = Array.from({ length: 12 }, (_, i) => ({
    month: i,
    confirmed: 0,
    completed: 0,
    revenueCents: 0,
  }));
  (days ?? []).forEach((d) => {
    const m = parseInt(d.date.slice(5, 7)) - 1;
    byMonth[m].confirmed += d.confirmed;
    byMonth[m].completed += d.completed;
    byMonth[m].revenueCents += d.revenueCents;
  });

  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setYearOffset((y) => y - 1)}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-dark-border text-muted hover:border-gold/40 hover:text-gold transition-all cursor-pointer bg-transparent"
        >‹</button>
        <span className="text-sm font-semibold">{year}</span>
        <button
          onClick={() => setYearOffset((y) => y + 1)}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-dark-border text-muted hover:border-gold/40 hover:text-gold transition-all cursor-pointer bg-transparent"
        >›</button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-10 gap-2 text-muted"><Spinner /> Carregando...</div>
      ) : (
        <>
          <StatsSummary days={days ?? []} />
          <div className="grid grid-cols-3 gap-3">
            {byMonth.map(({ month, confirmed, completed, revenueCents }) => {
              const total = confirmed + completed;
              const isCurrentMonth = year === currentYear && month === currentMonth;
              const monthOffset = (year - currentYear) * 12 + (month - currentMonth);

              return (
                <button
                  key={month}
                  onClick={() => onSelectMonth(monthOffset)}
                  className={`flex flex-col gap-1.5 p-4 rounded-xl border text-left transition-all cursor-pointer
                    ${isCurrentMonth ? 'border-gold bg-gold/5' : total > 0 ? 'border-dark-border bg-dark-surface hover:border-gold/30' : 'border-dark-border bg-dark-surface opacity-40 hover:opacity-60'}`}
                >
                  <span className={`text-xs font-semibold tracking-wide ${isCurrentMonth ? 'text-gold' : ''}`}>
                    {MONTH_NAMES[month].slice(0, 3).toUpperCase()}
                  </span>
                  {total > 0 ? (
                    <>
                      <span className="text-xl font-bold">{total}</span>
                      <span className="text-xs text-muted">{confirmed > 0 ? `${confirmed} agend.` : ''}{confirmed > 0 && completed > 0 ? ' · ' : ''}{completed > 0 ? `${completed} concl.` : ''}</span>
                      {revenueCents > 0 && (
                        <span className="text-xs text-green-400 font-medium">{formatCurrency(revenueCents)}</span>
                      )}
                    </>
                  ) : (
                    <span className="text-xl font-bold text-muted">—</span>
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function NoShowModal({ onConfirm, onClose, isPending }: { onConfirm: () => void; onClose: () => void; isPending: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-dark-surface border border-dark-border rounded-2xl p-6 w-full max-w-sm">
        <h3 className="text-lg font-bold mb-1">Confirmar não comparecimento</h3>
        <p className="text-muted text-sm mb-6">Tem certeza que o cliente não compareceu? Esta ação não pode ser desfeita.</p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isPending}
            className="flex-1 py-2.5 rounded-xl border border-dark-border text-muted hover:text-[#F0EDE8] transition-colors text-sm cursor-pointer bg-transparent disabled:opacity-50"
          >
            Voltar
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="flex-1 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-colors text-sm font-medium cursor-pointer disabled:opacity-50"
          >
            {isPending ? <Spinner /> : '✗ Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const today = dateToString(new Date());
  const [view, setView] = useState<'day' | 'week' | 'month' | 'year'>('day');
  const [date, setDate] = useState(today);
  const [page, setPage] = useState(1);
  const [targetMonthOffset, setTargetMonthOffset] = useState(0);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [noShowId, setNoShowId] = useState<string | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const { data: me } = useAdminMe();
  const { data, isLoading, refetch } = useAdminAppointments(date, page);
  const appointments = data?.appointments;
  const cancelAppointment = useAdminCancelAppointment();
  const updateStatus = useUpdateAppointmentStatus();

  function handleDateChange(newDate: string) {
    setDate(newDate);
    setPage(1);
  }

  function handleSelectDay(ds: string) {
    setDate(ds);
    setPage(1);
    setView('day');
  }

  function handleSelectMonth(offset: number) {
    setTargetMonthOffset(offset);
    setView('month');
  }

  async function handleLogout() {
    await logout();
    queryClient.clear();
    navigate('/admin/login');
  }

  function handleCancelConfirm(reason: string) {
    if (!cancelId) return;
    cancelAppointment.mutate({ id: cancelId, reason }, {
      onSuccess: () => setCancelId(null),
    });
  }

  function handleNoShowConfirm() {
    if (!noShowId) return;
    updateStatus.mutate({ id: noShowId, status: 'no_show' }, {
      onSuccess: () => setNoShowId(null),
    });
  }

  function hasTimePassed(apptDate: string, endTime: string): boolean {
    if (apptDate.slice(0, 10) < today) return true;
    if (apptDate.slice(0, 10) > today) return false;
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    return endTime <= currentTime;
  }

  const confirmed = appointments?.filter((a) => a.status === 'confirmed') ?? [];
  const upcoming = confirmed.filter((a) => !hasTimePassed(a.date, a.endTime));
  const overdue = confirmed.filter((a) => hasTimePassed(a.date, a.endTime));
  const done = appointments?.filter((a) => a.status !== 'confirmed') ?? [];

  return (
    <div className="relative z-10 max-w-[680px] mx-auto px-5 py-8 pb-20">
      {cancelId && (
        <CancelModal
          onConfirm={handleCancelConfirm}
          onClose={() => setCancelId(null)}
          isPending={cancelAppointment.isPending}
        />
      )}
      {noShowId && (
        <NoShowModal
          onConfirm={handleNoShowConfirm}
          onClose={() => setNoShowId(null)}
          isPending={updateStatus.isPending}
        />
      )}
      {showBookingModal && <AdminBookingModal onClose={() => setShowBookingModal(false)} />}
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <a href="/" className="flex items-center gap-2.5 no-underline">
          <img src="/logo.png" alt="Soberano Barbearia" className="w-8 h-8 object-contain"/>
          <span className="font-serif text-sm tracking-widest uppercase text-gold">Soberano</span>
        </a>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowBookingModal(true)}
            className="text-xs px-3 py-1.5 rounded-lg border border-gold text-gold hover:bg-gold/10 transition-colors cursor-pointer bg-transparent"
          >
            + Agendamento
          </button>
          {me && <BarberProfile barber={me} onLogout={handleLogout} onAgenda={() => navigate('/admin/schedule')} />}
        </div>
      </div>

      {/* View selector */}
      <div className="flex items-center gap-2 mb-6">
        <select
          value={view}
          onChange={(e) => setView(e.target.value as 'day' | 'week' | 'month' | 'year')}
          className="bg-dark-surface2 border border-dark-border rounded-xl px-3 py-2 text-sm text-[#F0EDE8] outline-none focus:border-gold transition-colors cursor-pointer"
        >
          <option value="day">Dia</option>
          <option value="week">Semana</option>
          <option value="month">Mês</option>
          <option value="year">Ano</option>
        </select>
        {view === 'day' && (
          <>
            <input
              type="date"
              value={date}
              onChange={(e) => handleDateChange(e.target.value)}
              className="bg-dark-surface2 border border-dark-border rounded-xl px-3 py-2 text-sm text-[#F0EDE8] outline-none focus:border-gold transition-colors"
            />
            <button
              onClick={() => handleDateChange(today)}
              className={`text-xs px-3 py-2 rounded-xl border transition-colors cursor-pointer ${date === today ? 'border-gold text-gold bg-gold/10' : 'border-dark-border text-muted hover:border-gold/40 bg-transparent'}`}
            >
              Hoje
            </button>
            <button
              onClick={() => refetch()}
              className="text-xl text-muted hover:text-[#F0EDE8] transition-colors ml-auto cursor-pointer bg-transparent border-none"
            >
              ↻
            </button>
          </>
        )}
      </div>

      {view === 'week' && <WeekView onSelectDay={handleSelectDay} />}
      {view === 'month' && <MonthView key={targetMonthOffset} initialOffset={targetMonthOffset} onSelectDay={handleSelectDay} />}
      {view === 'year' && <YearView onSelectMonth={handleSelectMonth} />}
      {view === 'day' && (isLoading ? (
        <div className="flex items-center justify-center py-20 gap-3 text-muted">
          <Spinner /> Carregando...
        </div>
      ) : !data?.total ? (
        <div className="text-center py-20">
          <p className="text-muted text-lg">Sem agendamentos neste dia.</p>
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { label: 'Agendados', value: data!.summary.confirmed, color: 'text-gold' },
              { label: 'Concluídos', value: data!.summary.completed, color: 'text-green-400' },
              { label: 'Faturamento', value: formatCurrency(data!.summary.revenueCents), color: 'text-gold' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-dark-surface border border-dark-border rounded-xl p-4 text-center">
                <p className={`text-base font-bold ${color}`}>{value}</p>
                <p className="text-muted text-xs mt-1">{label}</p>
              </div>
            ))}
          </div>

          {/* Overdue — time passed, needs action */}
          {overdue.length > 0 && (
            <section className="mb-6">
              <h2 className="text-xs tracking-widest uppercase text-orange-400 mb-3">Aguardando confirmação</h2>
              <div className="flex flex-col gap-3">
                {overdue.map((a) => <AppointmentCard key={a.id} appointment={a} timePassed={true} onCancelClick={setCancelId} onNoShowClick={setNoShowId} />)}
              </div>
            </section>
          )}

          {/* Upcoming */}
          {upcoming.length > 0 && (
            <section className="mb-6">
              <h2 className="text-xs tracking-widest uppercase text-muted mb-3">Próximos</h2>
              <div className="flex flex-col gap-3">
                {upcoming.map((a) => <AppointmentCard key={a.id} appointment={a} timePassed={false} onCancelClick={setCancelId} onNoShowClick={setNoShowId} />)}
              </div>
            </section>
          )}

          {/* Done */}
          {done.length > 0 && (
            <section>
              <h2 className="text-xs tracking-widest uppercase text-muted mb-3">Concluídos / Outros</h2>
              <div className="flex flex-col gap-3">
                {done.map((a) => <AppointmentCard key={a.id} appointment={a} timePassed={true} onCancelClick={setCancelId} onNoShowClick={setNoShowId} />)}
              </div>
            </section>
          )}

          {/* Pagination */}
          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-dark-border">
              <button
                onClick={() => setPage((p) => p - 1)}
                disabled={page <= 1}
                className="px-4 py-2 rounded-lg border border-dark-border text-sm text-muted hover:text-[#F0EDE8] hover:border-gold/40 transition-colors disabled:opacity-30 cursor-pointer bg-transparent"
              >
                ← Anterior
              </button>
              <span className="text-xs text-muted">
                Página {page} de {data.totalPages} · {data.total} agendamentos
              </span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= data.totalPages}
                className="px-4 py-2 rounded-lg border border-dark-border text-sm text-muted hover:text-[#F0EDE8] hover:border-gold/40 transition-colors disabled:opacity-30 cursor-pointer bg-transparent"
              >
                Próxima →
              </button>
            </div>
          )}
        </>
      ))}
    </div>
  );
}
