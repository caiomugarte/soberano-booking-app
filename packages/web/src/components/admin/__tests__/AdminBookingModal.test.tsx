import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminBookingModal } from '../AdminBookingModal.tsx';
import type { CustomerPackage } from '../../../api/use-admin.ts';

const mockMutate = vi.fn();
const mockUseAdminCustomerPackages = vi.fn<(phone: string) => { data: CustomerPackage[] }>();

vi.mock('../../../api/use-admin.ts', () => ({
  useAdminCreateBooking: () => ({
    mutate: mockMutate,
    isPending: false,
    isSuccess: false,
    isError: false,
    error: null,
  }),
  useAdminCustomerLookup: () => ({ data: undefined }),
  useAdminCustomerPackages: (phone: string) => mockUseAdminCustomerPackages(phone),
}));

vi.mock('../../../api/use-services.ts', () => ({
  useServices: () => ({
    data: [
      { id: 'svc-1', name: 'Corte', icon: '✂️', priceCents: 3500 },
    ],
  }),
}));

vi.mock('../../../api/use-slots.ts', () => ({
  useSlots: () => ({ data: [] }),
}));

const basePackage: CustomerPackage = {
  id: 'pkg-1',
  providerId: 'provider-1',
  customerName: 'Maria',
  customerPhone: '11999998888',
  totalUses: 5,
  usedCount: 1,
  totalPriceCents: 10000,
  status: 'active',
  createdAt: '2026-05-27T12:00:00.000Z',
  updatedAt: '2026-05-27T12:00:00.000Z',
};

function setPackages(packages: CustomerPackage[]) {
  mockUseAdminCustomerPackages.mockImplementation(() => ({
    data: packages,
  }));
}

function renderAdminBookingModal() {
  return render(<AdminBookingModal barberId="barber-1" onClose={vi.fn()} />);
}

async function fillRequiredFields() {
  fireEvent.change(screen.getByPlaceholderText('(11) 99999-9999'), { target: { value: '11999998888' } });
  fireEvent.change(screen.getByPlaceholderText('Nome do cliente'), { target: { value: 'Maria' } });
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'svc-1' } });

  const dateInput = document.querySelector('input[type="date"]');
  if (!(dateInput instanceof HTMLInputElement)) {
    throw new Error('Date input not found');
  }

  fireEvent.change(dateInput, { target: { value: '2026-06-15' } });
  fireEvent.change(screen.getByPlaceholderText('09:00'), { target: { value: '0900' } });
}

describe('AdminBookingModal', () => {
  beforeEach(() => {
    mockMutate.mockReset();
    mockUseAdminCustomerPackages.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('auto-selects the only usable package and allows deselecting before submit', async () => {
    setPackages([{ ...basePackage }]);

    renderAdminBookingModal();
    await fillRequiredFields();
    expect(screen.getByRole('button', { name: '1/5 usos — R$ 100,00' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar Agendamento' }));

    expect(mockMutate).toHaveBeenNthCalledWith(1, {
      serviceId: 'svc-1',
      date: '2026-06-15',
      startTime: '09:00',
      customerName: 'Maria',
      customerPhone: '1199998888',
      packageId: 'pkg-1',
    });

    fireEvent.click(screen.getByRole('button', { name: '1/5 usos — R$ 100,00' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar Agendamento' }));

    expect(mockMutate).toHaveBeenNthCalledWith(2, {
      serviceId: 'svc-1',
      date: '2026-06-15',
      startTime: '09:00',
      customerName: 'Maria',
      customerPhone: '1199998888',
    });
  });

  it('keeps multiple usable packages unselected until the provider picks one', async () => {
    setPackages([
      { ...basePackage, id: 'pkg-1' },
      { ...basePackage, id: 'pkg-2', totalUses: 8, usedCount: 3, totalPriceCents: 18000 },
    ]);

    renderAdminBookingModal();
    await fillRequiredFields();
    expect(screen.getByRole('button', { name: '1/5 usos — R$ 100,00' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '3/8 usos — R$ 180,00' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar Agendamento' }));

    expect(mockMutate).toHaveBeenNthCalledWith(1, {
      serviceId: 'svc-1',
      date: '2026-06-15',
      startTime: '09:00',
      customerName: 'Maria',
      customerPhone: '1199998888',
    });

    fireEvent.click(screen.getByRole('button', { name: '3/8 usos — R$ 180,00' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar Agendamento' }));

    expect(mockMutate).toHaveBeenNthCalledWith(2, {
      serviceId: 'svc-1',
      date: '2026-06-15',
      startTime: '09:00',
      customerName: 'Maria',
      customerPhone: '1199998888',
      packageId: 'pkg-2',
    });
  });

  it('hides the package selector when the customer has no usable packages', async () => {
    setPackages([
      { ...basePackage, id: 'pkg-1', status: 'completed', usedCount: 5 },
      { ...basePackage, id: 'pkg-2', status: 'active', usedCount: 5 },
    ]);

    renderAdminBookingModal();
    await fillRequiredFields();

    expect(screen.queryByText('Pacote')).not.toBeInTheDocument();
  });
});
