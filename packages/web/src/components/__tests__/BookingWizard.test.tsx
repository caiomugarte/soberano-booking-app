import { render, screen, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BookingWizard } from '../booking/BookingWizard';
import { useBookingStore } from '../../stores/booking.store';

let onSuccessRef: ((url: string) => void) | null = null;

vi.mock('../booking/ServiceStep', () => ({ ServiceStep: () => <div>mock-service-step</div> }));
vi.mock('../booking/BarberStep', () => ({ BarberStep: () => <div>mock-barber-step</div> }));
vi.mock('../booking/TimeStep', () => ({ TimeStep: () => <div>mock-time-step</div> }));
vi.mock('../booking/CustomerStep', () => ({ CustomerStep: () => <div>mock-customer-step</div> }));
vi.mock('../booking/ConfirmStep', () => ({
  ConfirmStep: ({ onSuccess }: { onSuccess: (url: string) => void }) => {
    onSuccessRef = onSuccess;
    return <div>mock-confirm-step</div>;
  },
}));
vi.mock('../booking/SuccessScreen', () => ({ SuccessScreen: () => <div>mock-success-screen</div> }));
vi.mock('../ui/StepIndicator', () => ({ StepIndicator: () => null }));

describe('BookingWizard', () => {
  beforeEach(() => {
    onSuccessRef = null;
    useBookingStore.getState().reset();
  });

  it('step 1 (default): renders ServiceStep and no Voltar button', () => {
    render(
      <MemoryRouter>
        <BookingWizard />
      </MemoryRouter>,
    );

    expect(screen.getByText('mock-service-step')).toBeDefined();
    expect(screen.queryByText('Voltar')).toBeNull();
  });

  it('step 2: renders BarberStep and shows Voltar button', () => {
    useBookingStore.getState().goToStep(2);

    render(
      <MemoryRouter>
        <BookingWizard />
      </MemoryRouter>,
    );

    expect(screen.getByText('mock-barber-step')).toBeDefined();
    expect(screen.getByText('Voltar')).toBeDefined();
  });

  it('step 5: renders ConfirmStep', () => {
    useBookingStore.getState().goToStep(5);

    render(
      <MemoryRouter>
        <BookingWizard />
      </MemoryRouter>,
    );

    expect(screen.getByText('mock-confirm-step')).toBeDefined();
  });

  it('success screen: shows SuccessScreen after ConfirmStep calls onSuccess', () => {
    useBookingStore.getState().goToStep(5);

    render(
      <MemoryRouter>
        <BookingWizard />
      </MemoryRouter>,
    );

    // ConfirmStep mock stores the onSuccess prop; call it to trigger the success screen
    act(() => {
      onSuccessRef!('http://cancel');
    });

    expect(screen.getByText('mock-success-screen')).toBeDefined();
  });
});
