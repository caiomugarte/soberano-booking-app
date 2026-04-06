import { useBarbers } from '../../api/use-barbers.ts';
import { useBookingStore } from '../../stores/booking.store.ts';
import { Panel } from '@soberano/ui';
import { StickyBar } from '@soberano/ui';

export function BarberStep() {
  const { data: barbers, isLoading } = useBarbers();
  const { barber, setBarber, nextStep, prevStep } = useBookingStore();

  return (
    <>
      <Panel title="Escolha o barbeiro" subtitle="Com quem você prefere ser atendido?">
        {isLoading ? (
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-32 bg-dark-surface2 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3 max-[420px]:grid-cols-1">
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
                {b.avatarUrl ? (
                  <img
                    src={b.avatarUrl}
                    alt={`${b.firstName} ${b.lastName}`}
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                    className={`w-14 h-14 rounded-full object-cover mx-auto mb-3 border-2 transition-colors ${barber?.id === b.id ? 'border-gold' : 'border-dark-border'}`}
                style={{objectPosition: 'center 30%' }}
                  />
                ) : (
                  <div className={`w-14 h-14 rounded-full bg-dark-border flex items-center justify-center text-2xl mx-auto mb-3 border-2 transition-colors ${barber?.id === b.id ? 'border-gold' : 'border-dark-border'}`}>
                    💈
                  </div>
                )}
                <div className="text-base font-semibold leading-snug">
                  {b.firstName} {b.lastName}
                </div>
              </button>
            ))}
          </div>
        )}
      </Panel>

      <StickyBar
        visible={!!barber}
        onNext={nextStep}
        onBack={prevStep}
        icon="💈"
        label={barber ? `${barber.firstName} ${barber.lastName}` : ''}
        sublabel="Barbeiro selecionado"
      />
    </>
  );
}
