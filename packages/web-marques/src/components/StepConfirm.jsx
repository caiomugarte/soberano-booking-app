import { Calendar, Clock, User, Scissors } from 'lucide-react';

function formatPrice(cents) {
  return `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`;
}

function formatDuration(minutes) {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}min`;
}

export default function StepConfirm({ selections, bookingError }) {
  return (
    <div className="step-container">
      <h2 className="step-title">Revise e Confirme</h2>
      
      <div style={{ borderRadius: 'var(--radius-md)', padding: '24px', color: 'var(--text-main)', backgroundColor: 'var(--surface-color)', border: '1px solid var(--border-color)' }}>
        
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '24px' }}>
          <div style={{ padding: '12px', background: 'var(--accent-soft)', borderRadius: '12px', color: 'var(--accent-color)' }}>
            <Scissors size={24} />
          </div>
          <div>
            <h3 style={{ fontSize: '18px', marginBottom: '4px' }}>{selections.service?.name}</h3>
            <p style={{ color: 'var(--text-muted)' }}>{selections.service?.priceCents != null ? formatPrice(selections.service.priceCents) : ''} • {selections.service?.duration != null ? formatDuration(selections.service.duration) : ''}</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px', paddingBottom: '24px', borderBottom: '1px solid var(--border-color)' }}>
          {selections.barber?.avatarUrl ? (
            <img
              src={selections.barber.avatarUrl}
              alt={`${selections.barber.firstName} ${selections.barber.lastName}`}
              style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }}
            />
          ) : (
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--accent-soft)', color: 'var(--accent-color)', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {selections.barber?.firstName?.[0]}{selections.barber?.lastName?.[0]}
            </div>
          )}
          <div>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Barbeiro</p>
            <h3 style={{ fontSize: '16px' }}>{selections.barber?.firstName} {selections.barber?.lastName}</h3>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Calendar size={20} style={{ color: 'var(--text-muted)' }} />
            <div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Data</p>
              <p style={{ fontSize: '14px', fontWeight: 500 }}>{selections.date?.label}</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Clock size={20} style={{ color: 'var(--text-muted)' }} />
            <div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Horário</p>
              <p style={{ fontSize: '14px', fontWeight: 500 }}>{selections.time}</p>
            </div>
          </div>
        </div>

        <div style={{ padding: '16px', backgroundColor: 'var(--bg-color)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <User size={20} style={{ color: 'var(--text-main)' }} />
            <div>
              <p style={{ fontSize: '14px', fontWeight: 500 }}>{selections.userName}</p>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{selections.userPhone}</p>
            </div>
          </div>
        </div>

      </div>

      {bookingError && (
        <p style={{ marginTop: '16px', color: '#e53e3e', fontSize: '14px', textAlign: 'center' }}>{bookingError}</p>
      )}
    </div>
  );
}
