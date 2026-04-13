import StatsCards from './StatsCards';

export default function DayView({ appointments, onUpdateStatus }) {
  const pending = appointments.filter(a => a.status === 'pending');
  const confirmed = appointments.filter(a => a.status === 'confirmed');
  const done = appointments.filter(a => a.status === 'done');

  const totalScheduled = appointments.length;
  const totalDone = done.length;
  const totalRevenue = done.reduce((sum, a) => sum + a.price, 0);

  return (
    <div>
      <StatsCards scheduled={totalScheduled} completed={totalDone} revenue={totalRevenue} />

      {pending.length > 0 && (
        <>
          <div className="admin-section-title">Aguardando Confirmação</div>
          <div className="admin-appointments">
            {pending.map(appt => (
              <AppointmentCard key={appt.id} appt={appt} onUpdateStatus={onUpdateStatus} />
            ))}
          </div>
        </>
      )}

      {confirmed.length > 0 && (
        <>
          <div className="admin-section-title">Próximos</div>
          <div className="admin-appointments">
            {confirmed.map(appt => (
              <AppointmentCard key={appt.id} appt={appt} onUpdateStatus={onUpdateStatus} />
            ))}
          </div>
        </>
      )}

      {done.length > 0 && (
        <>
          <div className="admin-section-title">Concluídos</div>
          <div className="admin-appointments">
            {done.map(appt => (
              <AppointmentCard key={appt.id} appt={appt} onUpdateStatus={onUpdateStatus} />
            ))}
          </div>
        </>
      )}

      {appointments.length === 0 && (
        <p style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--adm-text-muted)' }}>
          Nenhum agendamento para este dia.
        </p>
      )}
    </div>
  );
}

function AppointmentCard({ appt, onUpdateStatus }) {
  const statusLabel = { confirmed: 'Confirmado', pending: 'Pendente', done: 'Concluído', noshow: 'Não veio' };
  const statusClass = appt.status === 'pending' ? 'pending' : 'confirmed';

  return (
    <div className="admin-appt-card">
      <div className="admin-appt-top">
        <div className="admin-appt-service">
          <span className="admin-appt-service-icon">{appt.icon}</span>
          <h3>{appt.service}</h3>
          <span className={`admin-badge ${statusClass}`}>{statusLabel[appt.status] || appt.status}</span>
        </div>
        <div className="admin-appt-time">
          <div className="time">{appt.time}</div>
          <div className="until">até {appt.endTime}</div>
          <div className="price">R$ {appt.price.toFixed(2).replace('.', ',')}</div>
        </div>
      </div>
      <div className="admin-appt-client">{appt.client}</div>
      <div className="admin-appt-phone">{appt.phone}</div>
      <div className="admin-appt-actions">
        {appt.status !== 'done' && (
          <button className="btn-done" onClick={() => onUpdateStatus(appt.id, 'done')}>✓ Concluído</button>
        )}
        {appt.status !== 'noshow' && appt.status !== 'done' && (
          <button className="btn-noshow" onClick={() => onUpdateStatus(appt.id, 'noshow')}>✕ Não veio</button>
        )}
        <button className="btn-cancel" onClick={() => onUpdateStatus(appt.id, 'deleted')}>✕ {appt.status === 'done' ? 'Apagar' : 'Cancelar'}</button>
      </div>
    </div>
  );
}
