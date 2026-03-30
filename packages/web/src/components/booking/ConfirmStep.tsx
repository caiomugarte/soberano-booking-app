import { useBookingStore } from '../../stores/booking.store.ts';
import { useCreateBooking } from '../../api/use-create-booking.ts';
import { Panel } from '../ui/Panel.tsx';
import { StickyBar } from '../ui/StickyBar.tsx';
import { formatCurrency, formatDateLong } from '../../lib/format.ts';

interface ConfirmStepProps {
  onSuccess: (cancelUrl: string) => void;
}

export function ConfirmStep({ onSuccess }: ConfirmStepProps) {
  const { service, barber, date, slot, customerName, customerPhone, prevStep } = useBookingStore();
  const createBooking = useCreateBooking();

  async function handleConfirm() {
    if (!service || !barber || !date || !slot) return;

    const result = await createBooking.mutateAsync({
      serviceId: service.id,
      barberId: barber.id,
      date,
      startTime: slot,
      customerName,
      customerPhone,
    });

    onSuccess(result.cancelUrl);
  }

  const rows = [
    { key: 'Serviço', value: service?.name, gold: true },
    { key: 'Barbeiro', value: barber ? `${barber.firstName} ${barber.lastName}` : '' },
    { key: 'Data', value: date ? formatDateLong(date) : '' },
    { key: 'Horário', value: slot ?? '' },
    { key: 'Nome', value: customerName },
    { key: 'WhatsApp', value: `+55 ${customerPhone}` },
    { key: 'Valor', value: service ? formatCurrency(service.priceCents) : '', gold: true },
  ];

  return (
    <>
      <Panel title="Confirmar agendamento" subtitle="Revise os detalhes antes de confirmar">
        <div className="bg-dark-surface2 border border-dark-border rounded-xl p-5">
          {rows.map(({ key, value, gold }) => (
            <div key={key} className="flex justify-between items-start py-2.5 text-sm gap-3 border-b border-dark-border last:border-0">
              <span className="text-muted whitespace-nowrap">{key}</span>
              <span className={`font-medium text-right ${gold ? 'text-gold text-base' : ''}`}>{value}</span>
            </div>
          ))}
        </div>

        {createBooking.isError && (
          <p className="text-red-400 text-sm text-center mt-4">{(createBooking.error as Error).message}</p>
        )}
      </Panel>

      <StickyBar
        visible={true}
        onNext={handleConfirm}
        onBack={prevStep}
        icon={service?.icon}
        label="Confirmar agendamento"
        sublabel={service ? `${service.name} · ${formatCurrency(service.priceCents)}` : undefined}
        nextLabel="✓ Confirmar"
        loading={createBooking.isPending}
        variant="confirm"
      />
    </>
  );
}
