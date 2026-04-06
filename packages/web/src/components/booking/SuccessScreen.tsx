import { useBookingStore } from '../../stores/booking.store.ts';
import { Button } from '@soberano/ui';
import { formatCurrency, formatDateLong } from '../../lib/format.ts';

interface SuccessScreenProps {
  cancelUrl: string;
  onReset: () => void;
}

export function SuccessScreen({ onReset }: SuccessScreenProps) {
  const { service, barber, date, slot } = useBookingStore();

  return (
    <div className="text-center py-15 px-5 animate-[fadeUp_0.5s_ease]">
      <div className="w-18 h-18 rounded-full bg-gold/10 border-2 border-gold flex items-center justify-center text-[28px] mx-auto mb-6">
        ✓
      </div>
      <h2 className="text-[32px] font-black mb-3">Agendado!</h2>
      <p className="text-muted text-[15px] leading-relaxed max-w-xs mx-auto mb-8">
        Você vai receber uma confirmação no WhatsApp em instantes. Até lá! ✂️
      </p>

      <div className="bg-dark-surface border border-dark-border rounded-xl p-5 max-w-sm mx-auto mb-8 text-left">
        {[
          { key: 'Serviço', value: service?.name, gold: true },
          { key: 'Barbeiro', value: barber ? `${barber.firstName} ${barber.lastName}` : '' },
          { key: 'Data', value: date ? formatDateLong(date) : '' },
          { key: 'Horário', value: slot ?? '' },
          { key: 'Valor', value: service ? formatCurrency(service.priceCents) : '', gold: true },
        ].map(({ key, value, gold }) => (
          <div key={key} className="flex justify-between items-start py-2.5 text-sm gap-3 border-b border-dark-border last:border-0">
            <span className="text-muted whitespace-nowrap">{key}</span>
            <span className={`font-medium text-right ${gold ? 'text-gold text-base' : ''}`}>{value}</span>
          </div>
        ))}
      </div>

      <Button className="max-w-[280px] mx-auto" onClick={onReset}>
        Fazer outro agendamento
      </Button>
    </div>
  );
}
