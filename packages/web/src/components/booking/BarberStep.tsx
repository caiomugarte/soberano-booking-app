import { useBarbers } from '../../api/use-barbers.ts';
import { useBookingStore } from '../../stores/booking.store.ts';
import { Panel } from '../ui/Panel.tsx';
import { Button } from '../ui/Button.tsx';

export function BarberStep() {
  const { data: barbers, isLoading } = useBarbers();
  const { barber, setBarber, nextStep, prevStep } = useBookingStore();

  return (
    <Panel title="Escolha o barbeiro" subtitle="Com quem você prefere ser atendido?">
      {isLoading ? (
        <div className="grid grid-cols-3 gap-3 mb-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 bg-dark-surface2 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3 mb-6 max-[420px]:grid-cols-1">
          {barbers?.map((b) => (
            <button
              key={b.id}
              onClick={() => setBarber(b)}
              className={`relative border rounded-xl py-6 px-3 pb-5 cursor-pointer transition-all duration-200 overflow-hidden text-center
                ${barber?.id === b.id
                  ? 'border-gold bg-gold/[0.06]'
                  : 'border-dark-border bg-dark-surface2 hover:border-gold/40 hover:-translate-y-px'
                }`}
            >
              {barber?.id === b.id && (
                <span className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-gold flex items-center justify-center text-[11px] text-dark font-bold">✓</span>
              )}
              <div className={`w-14 h-14 rounded-full bg-dark-border flex items-center justify-center text-2xl mx-auto mb-3 border-2 transition-colors ${barber?.id === b.id ? 'border-gold' : 'border-dark-border'}`}>
                💈
              </div>
              <div className="font-serif text-[13px] font-bold leading-snug">
                {b.firstName}<br />{b.lastName}
              </div>
            </button>
          ))}
        </div>
      )}
      <Button disabled={!barber} onClick={nextStep}>Continuar →</Button>
      <Button variant="secondary" onClick={prevStep}>← Voltar</Button>
    </Panel>
  );
}
