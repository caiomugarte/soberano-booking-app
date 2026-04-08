import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ConfirmStep } from '../booking/ConfirmStep';
import { useBookingStore } from '../../stores/booking.store';

const mockMutateAsync = vi.fn();
let mockIsError = false;
let mockError: Error | null = null;

vi.mock('../../api/use-create-booking', () => ({
  useCreateBooking: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
    get isError() { return mockIsError; },
    get error() { return mockError; },
  }),
}));

vi.mock('../ui/Panel', () => ({
  Panel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('../ui/StickyBar', () => ({
  StickyBar: ({ onNext }: { onNext: () => void }) => (
    <button onClick={onNext}>Confirmar agendamento</button>
  ),
}));

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

const defaultStoreState = {
  service: { id: 1, name: 'Corte', priceCents: 3500, icon: '✂️' } as any,
  barber: { id: 1, firstName: 'João', lastName: 'Silva' } as any,
  date: '2026-06-15',
  slot: '10:00',
  customerName: 'Maria',
  customerPhone: '11999998888',
};

describe('ConfirmStep', () => {
  beforeEach(() => {
    useBookingStore.getState().reset();
    useBookingStore.setState(defaultStoreState);
    mockMutateAsync.mockReset();
  });

  afterEach(() => {
    mockIsError = false;
    mockError = null;
  });

  it('displays all summary rows', () => {
    render(<ConfirmStep onSuccess={vi.fn()} />, { wrapper });

    expect(screen.getByText('Corte')).toBeInTheDocument();
    expect(screen.getByText('João Silva')).toBeInTheDocument();
    expect(screen.getByText('Segunda-feira, 15/06')).toBeInTheDocument();
    expect(screen.getByText('10:00')).toBeInTheDocument();
    expect(screen.getByText('Maria')).toBeInTheDocument();
    expect(screen.getByText('+55 11999998888')).toBeInTheDocument();
    expect(screen.getByText('R$ 35,00')).toBeInTheDocument();
  });

  it('shows error message on mutation failure', () => {
    mockIsError = true;
    mockError = new Error('Horário indisponível');

    render(<ConfirmStep onSuccess={vi.fn()} />, { wrapper });

    expect(screen.getByText('Horário indisponível')).toBeInTheDocument();
  });

  it('calls onSuccess with cancelUrl on mutation success', async () => {
    mockMutateAsync.mockResolvedValue({ cancelUrl: 'http://cancel/abc' });
    const onSuccess = vi.fn();

    render(<ConfirmStep onSuccess={onSuccess} />, { wrapper });

    await userEvent.click(screen.getByRole('button', { name: 'Confirmar agendamento' }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith('http://cancel/abc'));
  });
});
