import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PackagesPage from '../PackagesPage.tsx';

const useAdminPackages = vi.fn();
const useAdminMe = vi.fn();
const useAdminDeactivatePackage = vi.fn();

vi.mock('../../../api/use-admin.ts', () => ({
  adminPackageQueryKeys: {
    all: ['admin-packages'],
  },
  useAdminPackages: (...args: unknown[]) => useAdminPackages(...args),
  useAdminMe: () => useAdminMe(),
  useAdminDeactivatePackage: () => useAdminDeactivatePackage(),
}));

vi.mock('../../../components/admin/PackageWorkspaceModal.tsx', () => ({
  PackageWorkspaceModal: ({ packageId }: { packageId: string }) => <div>Workspace {packageId}</div>,
}));

function renderPackagesPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <PackagesPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('PackagesPage', () => {
  beforeEach(() => {
    useAdminPackages.mockReset();
    useAdminMe.mockReset();
    useAdminDeactivatePackage.mockReset();

    useAdminMe.mockReturnValue({ data: { id: 'provider-1' } });
    useAdminDeactivatePackage.mockReturnValue({ isPending: false, mutate: vi.fn() });
  });

  it('loads active packages first and keeps fully booked active packages visible', () => {
    useAdminPackages.mockReturnValue({
      data: [
        {
          id: 'pkg-active-open',
          providerId: 'provider-1',
          customerName: 'Maria',
          customerPhone: '11999998888',
          totalUses: 5,
          usedCount: 3,
          totalPriceCents: 10000,
          status: 'active',
          createdAt: '2026-05-27T12:00:00.000Z',
          updatedAt: '2026-05-27T12:00:00.000Z',
        },
        {
          id: 'pkg-active-full',
          providerId: 'provider-1',
          customerName: 'Joana',
          customerPhone: '11999997777',
          totalUses: 2,
          usedCount: 2,
          totalPriceCents: 8000,
          status: 'active',
          createdAt: '2026-05-27T12:00:00.000Z',
          updatedAt: '2026-05-27T12:00:00.000Z',
        },
      ],
      isLoading: false,
    });

    renderPackagesPage();

    expect(useAdminPackages).toHaveBeenCalledWith('active');
    expect(screen.getByText('Maria')).toBeInTheDocument();
    expect(screen.getByText('Joana')).toBeInTheDocument();
    expect(screen.getAllByText('Ver detalhes')).toHaveLength(2);
    expect(screen.getAllByText('Desativar')).toHaveLength(2);
    expect(screen.getByText('Agendar uso')).toBeInTheDocument();
  });

  it('switches to the all filter and keeps search client-side', async () => {
    const user = userEvent.setup();
    useAdminPackages.mockReturnValue({
      data: [
        {
          id: 'pkg-active',
          providerId: 'provider-1',
          customerName: 'Maria',
          customerPhone: '11999998888',
          totalUses: 4,
          usedCount: 1,
          totalPriceCents: 12000,
          status: 'active',
          createdAt: '2026-05-27T12:00:00.000Z',
          updatedAt: '2026-05-27T12:00:00.000Z',
        },
      ],
      isLoading: false,
    });

    renderPackagesPage();

    await user.click(screen.getByRole('button', { name: 'Todos' }));
    await user.type(screen.getByPlaceholderText('Buscar por nome ou telefone...'), 'Maria');

    expect(useAdminPackages).toHaveBeenNthCalledWith(1, 'active');
    expect(useAdminPackages).toHaveBeenLastCalledWith(undefined);
    expect(screen.getByText('Maria')).toBeInTheDocument();
  });
});
