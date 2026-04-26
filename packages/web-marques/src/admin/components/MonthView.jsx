import StatsCards from './StatsCards';

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const DAY_NAMES = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM'];

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year, month) {
  const d = new Date(year, month, 1).getDay();
  return d === 0 ? 6 : d - 1; // Monday = 0
}

export default function MonthView({ appointments, currentDate, onPrev, onNext }) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const today = new Date();

  const monthAppts = appointments.filter(a => {
    const d = new Date(a.date + 'T00:00:00');
    return d.getMonth() === month && d.getFullYear() === year;
  });

  const totalScheduled = monthAppts.length;
  const totalDone = monthAppts.filter(a => a.status === 'done').length;
  const totalRevenue = monthAppts.filter(a => a.status === 'done').reduce((s, a) => s + a.price, 0);

  const getCountForDay = (day) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return appointments.filter(a => a.date === dateStr).length;
  };

  const cells = [];
  for (let i = 0; i < firstDay; i++) {
    cells.push(<div key={`e-${i}`} className="admin-month-day empty"></div>);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const count = getCountForDay(d);
    const isToday = today.getDate() === d && today.getMonth() === month && today.getFullYear() === year;
    cells.push(
      <div key={d} className={`admin-month-day ${isToday ? 'today' : ''}`}>
        <div className="day-number">{d}</div>
        {count > 0 && <div className="day-count">{count}</div>}
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', padding: '8px 24px 16px' }}>
        <div className="admin-nav-arrows">
          <button onClick={onPrev}>&lt;</button>
        </div>
        <span className="admin-period-label">{MONTHS[month]} {year}</span>
        <div className="admin-nav-arrows">
          <button onClick={onNext}>&gt;</button>
        </div>
      </div>

      <StatsCards scheduled={totalScheduled} completed={totalDone} revenue={totalRevenue} />

      <div className="admin-month-grid">
        <div className="admin-month-header">
          {DAY_NAMES.map(d => <div key={d}>{d}</div>)}
        </div>
        <div className="admin-month-body">
          {cells}
        </div>
      </div>
    </div>
  );
}
