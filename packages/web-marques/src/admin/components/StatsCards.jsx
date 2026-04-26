export default function StatsCards({ scheduled, completed, revenue }) {
  return (
    <div className="admin-stats">
      <div className="admin-stat-card">
        <div className="admin-stat-value gold">{scheduled}</div>
        <div className="admin-stat-label">Agendados</div>
      </div>
      <div className="admin-stat-card">
        <div className="admin-stat-value green">{completed}</div>
        <div className="admin-stat-label">Concluídos</div>
      </div>
      <div className="admin-stat-card">
        <div className="admin-stat-value gold">R$ {revenue.toFixed(2).replace('.', ',')}</div>
        <div className="admin-stat-label">Faturamento</div>
      </div>
    </div>
  );
}
