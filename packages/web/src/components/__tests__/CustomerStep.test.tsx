import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CustomerStep } from '../booking/CustomerStep';
import { useBookingStore } from '../../stores/booking.store';

vi.mock('../ui/StickyBar', () => ({
  StickyBar: ({ visible, onNext }: { visible: boolean; onNext: () => void }) => (
    <button data-visible={String(visible)} onClick={onNext}>
      Continuar
    </button>
  ),
}));

vi.mock('../ui/Panel', () => ({
  Panel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

function renderCustomerStep() {
  return render(
    <MemoryRouter>
      <CustomerStep />
    </MemoryRouter>,
  );
}

describe('CustomerStep', () => {
  beforeEach(() => {
    useBookingStore.getState().reset();
  });

  it('continue button hidden when form incomplete', () => {
    renderCustomerStep();
    const button = screen.getByRole('button', { name: 'Continuar' });
    expect(button.getAttribute('data-visible')).toBe('false');
  });

  it('continue button visible when name ≥ 2 chars and phone ≥ 10 digits', async () => {
    const user = userEvent.setup();
    renderCustomerStep();

    await user.type(screen.getByPlaceholderText('Ex: João Silva'), 'João');
    await user.type(screen.getByPlaceholderText('(11) 99999-9999'), '11999998888');

    const button = screen.getByRole('button', { name: 'Continuar' });
    expect(button.getAttribute('data-visible')).toBe('true');
  });

  it('phone input applies formatPhone mask', async () => {
    const user = userEvent.setup();
    renderCustomerStep();

    const phoneInput = screen.getByPlaceholderText('(11) 99999-9999');
    await user.type(phoneInput, '11999998888');

    expect((phoneInput as HTMLInputElement).value).toBe('(11) 99999-8888');
  });

  it('continue click calls setCustomer and nextStep', async () => {
    const user = userEvent.setup();
    renderCustomerStep();

    const setCustomerSpy = vi.spyOn(useBookingStore.getState(), 'setCustomer');
    const nextStepSpy = vi.spyOn(useBookingStore.getState(), 'nextStep');

    await user.type(screen.getByPlaceholderText('Ex: João Silva'), 'João');
    await user.type(screen.getByPlaceholderText('(11) 99999-9999'), '11999998888');

    await user.click(screen.getByRole('button', { name: 'Continuar' }));

    expect(setCustomerSpy).toHaveBeenCalledWith('João', '11999998888');
    expect(nextStepSpy).toHaveBeenCalledOnce();
  });
});
