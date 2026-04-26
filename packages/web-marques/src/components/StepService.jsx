import { useQuery } from '@tanstack/react-query';
import { api } from '../config/api.js';

function formatPrice(cents) {
  return `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`;
}

function formatDuration(minutes) {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}min`;
}

export default function StepService({ selected, onSelect }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['services'],
    queryFn: () => api.get('/services').then(r => r.services),
    staleTime: Infinity,
  });

  if (isLoading) {
    return (
      <div className="step-container">
        <h2 className="step-title">Escolha o Serviço</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="selection-card" style={{ height: '72px', opacity: 0.4, background: 'var(--surface-color)' }} />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="step-container">
        <h2 className="step-title">Escolha o Serviço</h2>
        <p style={{ color: 'var(--text-muted)' }}>Erro ao carregar serviços. Tente novamente.</p>
      </div>
    );
  }

  return (
    <div className="step-container">
      <h2 className="step-title">Escolha o Serviço</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {data.map(service => (
          <div
            key={service.id}
            className={`selection-card ${selected?.id === service.id ? 'active' : ''}`}
            onClick={() => onSelect(service)}
          >
            <div style={{ padding: '12px', background: 'var(--accent-soft)', borderRadius: '12px', color: 'var(--accent-color)', fontSize: '24px', lineHeight: 1 }}>
              {service.icon}
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: '18px', marginBottom: '4px' }}>{service.name}</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>{formatDuration(service.duration)}</p>
            </div>
            <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
              {formatPrice(service.priceCents)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
