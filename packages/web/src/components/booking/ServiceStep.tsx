import { useServices } from '../../api/use-services.ts';
import { useBookingStore } from '../../stores/booking.store.ts';
import { Panel } from '../ui/Panel.tsx';
import { Button } from '../ui/Button.tsx';
import { formatCurrency } from '../../lib/format.ts';

export function ServiceStep() {
  const { data: services, isLoading } = useServices();
  const { service, setService, nextStep } = useBookingStore();

  return (
    <Panel title="Qual serviço?" subtitle="Selecione o que você deseja hoje">
      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 mb-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 bg-dark-surface2 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 mb-5 max-sm:grid-cols-1">
          {services?.map((s) => (
            <button
              key={s.id}
              onClick={() => setService(s)}
              className={`relative border rounded-xl p-4 text-left cursor-pointer transition-all duration-200 overflow-hidden
                ${service?.id === s.id
                  ? 'border-gold bg-gold/[0.06]'
                  : 'border-dark-border bg-dark-surface2 hover:border-gold/40 hover:-translate-y-px'
                }`}
            >
              {service?.id === s.id && (
                <span className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-gold flex items-center justify-center text-[11px] text-dark font-bold">✓</span>
              )}
              <div className="text-[22px] mb-2.5">{s.icon}</div>
              <div className="font-serif text-sm font-bold mb-2.5 leading-snug">{s.name}</div>
              <div className="text-lg font-medium text-gold">{formatCurrency(s.priceCents)}</div>
            </button>
          ))}
        </div>
      )}
      <Button disabled={!service} onClick={nextStep}>Continuar →</Button>
    </Panel>
  );
}
