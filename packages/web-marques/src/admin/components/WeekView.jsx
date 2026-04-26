import StatsCards from './StatsCards';

const HOURS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
const DAY_NAMES = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM'];

function getWeekDates(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const dt = new Date(monday);
    dt.setDate(monday.getDate() + i);
    dates.push(dt);
  }
  return dates;
}

function formatDateStr(d) {
  return d.toISOString().split('T')[0];
}

const MONTHS_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export default function WeekView({ appointments, currentDate, onPrev, onNext }) {
  const weekDates = getWeekDates(currentDate);
  const startLabel = `${weekDates[0].getDate()} ${MONTHS_SHORT[weekDates[0].getMonth()]}`;
  const endLabel = `${weekDates[6].getDate()} ${MONTHS_SHORT[weekDates[6].getMonth()]}`;

  const weekAppts = appointments.filter(a => {
    const aDate = new Date(a.date + 'T00:00:00');
    return aDate >= weekDates[0] && aDate <= weekDates[6];
  });

  const totalScheduled = weekAppts.length;
  const totalDone = weekAppts.filter(a => a.status === 'done').length;
  const totalRevenue = weekAppts.filter(a => a.status === 'done').reduce((s, a) => s + a.price, 0);

  const getEventsForCell = (dayIndex, hour) => {
    const dateStr = formatDateStr(weekDates[dayIndex]);
    return appointments.filter(a => {
      const h = parseInt(a.time.split(':')[0], 10);
      return a.date === dateStr && h === hour;
    });
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', padding: '8px 24px 16px' }}>
        <div className="admin-nav-arrows">
          <button onClick={onPrev}>&lt;</button>
        </div>
        <span className="admin-period-label">{startLabel} — {endLabel}</span>
        <div className="admin-nav-arrows">
          <button onClick={onNext}>&gt;</button>
        </div>
      </div>

      <StatsCards scheduled={totalScheduled} completed={totalDone} revenue={totalRevenue} />

      <div className="admin-week-grid">
        <div className="admin-week-header">
          <div></div>
          {weekDates.map((d, i) => (
            <div key={i}>
              {DAY_NAMES[i]}
              <span className="day-num">{d.getDate()}</span>
            </div>
          ))}
        </div>
        <div className="admin-week-body">
          {HOURS.map(hour => (
            <div className="admin-week-row" key={hour}>
              <div className="admin-week-hour">{hour}h</div>
              {weekDates.map((_, dayIdx) => {
                const events = getEventsForCell(dayIdx, hour);
                return (
                  <div className="admin-week-cell" key={dayIdx}>
                    {events.map(ev => (
                      <div className="admin-week-event" key={ev.id}>
                        {ev.time}<br />{ev.client}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
