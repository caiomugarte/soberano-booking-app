import { useState } from 'react';
import { useBookingStore } from '../../stores/booking.store.ts';
import { StepIndicator } from '@soberano/ui';
import { ServiceStep } from './ServiceStep.tsx';
import { BarberStep } from './BarberStep.tsx';
import { TimeStep } from './TimeStep.tsx';
import { CustomerStep } from './CustomerStep.tsx';
import { ConfirmStep } from './ConfirmStep.tsx';
import { SuccessScreen } from './SuccessScreen.tsx';

export function BookingWizard() {
  const { step, reset, prevStep } = useBookingStore();
  const [cancelUrl, setCancelUrl] = useState<string | null>(null);

  function handleSuccess(url: string) {
    setCancelUrl(url);
  }

  function handleReset() {
    setCancelUrl(null);
    reset();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  if (cancelUrl) {
    return <SuccessScreen cancelUrl={cancelUrl} onReset={handleReset} />;
  }

  return (
    <>
      <div className="mb-9">
        {step > 1 && (
          <button
            onClick={prevStep}
            className="flex items-center gap-1.5 text-muted hover:text-gold transition-colors text-[13px] cursor-pointer mb-4"
          >
            <span className="text-base leading-none">←</span>
            <span>Voltar</span>
          </button>
        )}
        <StepIndicator current={step} />
      </div>
      {step === 1 && <ServiceStep />}
      {step === 2 && <BarberStep />}
      {step === 3 && <TimeStep />}
      {step === 4 && <CustomerStep />}
      {step === 5 && <ConfirmStep onSuccess={handleSuccess} />}
    </>
  );
}
