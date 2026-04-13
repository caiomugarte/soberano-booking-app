import { useQuery } from '@tanstack/react-query';
import { api } from '../config/api.js';

export default function StepBarber({ selected, onSelect }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['barbers'],
    queryFn: () => api.get('/barbers').then(r => r.barbers),
    staleTime: Infinity,
  });

  if (isLoading) {
    return (
      <div className="step-container" style={{ animation: 'fadeIn 0.4s ease-out forwards' }}>
        <h2 className="step-title">Escolha o Profissional</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {[1, 2].map(i => (
            <div key={i} className="selection-card" style={{ height: '160px', opacity: 0.4, background: 'var(--surface-color)' }} />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="step-container" style={{ animation: 'fadeIn 0.4s ease-out forwards' }}>
        <h2 className="step-title">Escolha o Profissional</h2>
        <p style={{ color: 'var(--text-muted)' }}>Erro ao carregar barbeiros. Tente novamente.</p>
      </div>
    );
  }

  return (
    <div className="step-container" style={{ animation: 'fadeIn 0.4s ease-out forwards' }}>
      <h2 className="step-title">Escolha o Profissional</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {data.map(barber => {
          const displayName = `${barber.firstName} ${barber.lastName}`;
          return (
            <div
              key={barber.id}
              className={`selection-card ${selected?.id === barber.id ? 'active' : ''}`}
              onClick={() => onSelect(barber)}
              style={{ flexDirection: 'column', textAlign: 'center', padding: '24px 16px' }}
            >
              {barber.avatarUrl ? (
                <img
                  src={barber.avatarUrl}
                  alt={displayName}
                  style={{
                    width: '80px', height: '80px',
                    borderRadius: '50%', objectFit: 'cover',
                    border: selected?.id === barber.id ? '2px solid var(--accent-color)' : '2px solid var(--border-color)',
                    marginBottom: '12px'
                  }}
                />
              ) : (
                <div style={{
                  width: '80px', height: '80px',
                  borderRadius: '50%', background: 'var(--accent-soft)',
                  color: 'var(--accent-color)', fontSize: '24px', fontWeight: 600,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: selected?.id === barber.id ? '2px solid var(--accent-color)' : '2px solid var(--border-color)',
                  marginBottom: '12px'
                }}>
                  {barber.firstName[0]}{barber.lastName[0]}
                </div>
              )}
              <h3 style={{ fontSize: '18px', marginBottom: '4px' }}>{displayName}</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{barber.role}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
