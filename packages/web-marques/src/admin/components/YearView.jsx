import StatsCards from './StatsCards';

const MONTHS_SHORT = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

export default function YearView({ monthlyData, currentDate, onPrev, onNext }) {
  const year = currentDate.getFullYear();

  const totalScheduled = Object.values(monthlyData).reduce((s, m) => s + m.total, 0);
  const totalDone = Object.values(monthlyData).reduce((s, m) => s + m.done, 0);
  const totalRevenue = Object.values(monthlyData).reduce((s, m) => s + m.revenue, 0);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', padding: '8px 24px 16px' }}>
        <div className="admin-nav-arrows">
          <button onClick={onPrev}>&lt;</button>
        </div>
        <span className="admin-period-label">{year}</span>
        <div className="admin-nav-arrows">
          <button onClick={onNext}>&gt;</button>
        </div>
      </div>

      <StatsCards scheduled={totalScheduled} completed={totalDone} revenue={totalRevenue} />

      <div className="admin-year-grid">
        {MONTHS_SHORT.map((name, i) => {
          const data = monthlyData[i + 1];
          const hasData = data && data.total > 0;
          return (
            <div key={name} className={`admin-year-card ${hasData ? 'has-data' : ''}`}>
              <div className="month-name">{name}</div>
              {hasData ? (
                <>
                  <div className="month-total">{data.total}</div>
                  <div className="month-details">{data.total} agend. · {data.done} concl.</div>
                  <div className="month-revenue">R$ {data.revenue.toFixed(2).replace('.', ',')}</div>
                </>
              ) : (
                <div className="no-data">—</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
