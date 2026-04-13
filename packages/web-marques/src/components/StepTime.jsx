import { useQuery } from '@tanstack/react-query';
import { api } from '../config/api.js';

const PT_DAY_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const PT_MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

function buildAvailableDates(workDays) {
  const results = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 1; results.length < 7 && i <= 14; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    if (workDays.includes(d.getDay())) {
      const iso = d.toISOString().slice(0, 10);
      const label = `${PT_DAY_NAMES[d.getDay()]}, ${d.getDate()} de ${PT_MONTH_NAMES[d.getMonth()]}`;
      results.push({ iso, label, dayName: PT_DAY_NAMES[d.getDay()], dayNum: String(d.getDate()) });
    }
  }
  return results;
}

export default function StepTime({ barber, selectedDate, selectedTime, onSelectDate, onSelectTime }) {
  const dates = barber?.workDays ? buildAvailableDates(barber.workDays) : [];

  const { data: slots, isLoading: loadingSlots } = useQuery({
    queryKey: ['slots', barber?.id, selectedDate?.iso],
    queryFn: () => api.get(`/slots?barberId=${barber.id}&date=${selectedDate.iso}`).then(r => r.slots),
    enabled: !!barber && !!selectedDate?.iso,
    staleTime: 0,
  });

  const availableSlots = slots?.filter(s => s.available) ?? [];

  return (
    <div className="step-container">
      <h2 className="step-title">Escolha um Horário</h2>

      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '12px', paddingRight: '12px' }}>
          {dates.map(date => (
            <div
              key={date.iso}
              onClick={() => { onSelectDate(date); onSelectTime(null); }}
              style={{
                minWidth: '80px',
                padding: '16px 12px',
                borderRadius: '12px',
                textAlign: 'center',
                backgroundColor: selectedDate?.iso === date.iso ? 'var(--accent-color)' : 'var(--surface-color)',
                color: selectedDate?.iso === date.iso ? '#fff' : 'var(--text-main)',
                border: '1px solid var(--border-color)',
                cursor: 'pointer',
                transition: 'var(--transition)'
              }}
            >
              <div style={{ fontSize: '12px', marginBottom: '4px', opacity: 0.8 }}>{date.dayName}</div>
              <div style={{ fontSize: '20px', fontWeight: 600 }}>{date.dayNum}</div>
            </div>
          ))}
        </div>
      </div>

      {selectedDate && (
        loadingSlots ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>Carregando horários...</p>
        ) : availableSlots.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>Nenhum horário disponível</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '12px' }}>
            {availableSlots.map(slot => (
              <button
                key={slot.startTime}
                onClick={() => onSelectTime(slot.startTime)}
                style={{
                  padding: '12px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 500,
                  backgroundColor: selectedTime === slot.startTime ? 'var(--accent-color)' : 'var(--surface-color)',
                  color: selectedTime === slot.startTime ? '#fff' : 'var(--text-main)',
                  border: `1px solid ${selectedTime === slot.startTime ? 'var(--accent-color)' : 'var(--border-color)'}`,
                  cursor: 'pointer',
                  transition: 'var(--transition)'
                }}
              >
                {slot.startTime}
              </button>
            ))}
          </div>
        )
      )}
    </div>
  );
}
