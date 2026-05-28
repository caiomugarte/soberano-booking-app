import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  adminPackageQueryKeys,
  type CustomerPackage,
  type CustomerPackageStatus,
  useAdminDeactivatePackage,
  useAdminMe,
  useAdminPackages,
} from '../../api/use-admin.ts';
import { AdminPackageModal } from '../../components/admin/AdminPackageModal.tsx';
import { PackageWorkspaceModal } from '../../components/admin/PackageWorkspaceModal.tsx';
import { Spinner } from '../../components/ui/Spinner.tsx';
import { formatCurrency } from '../../lib/format.ts';

const STATUS_LABEL: Record<string, string> = {
  active: 'Ativo',
  completed: 'Concluído',
  cancelled: 'Cancelado',
};

const STATUS_COLOR: Record<string, string> = {
  active: 'text-gold border-gold/30 bg-gold/10',
  completed: 'text-green-400 border-green-400/30 bg-green-400/10',
  cancelled: 'text-muted border-dark-border bg-dark-surface2',
};

type StatusFilter = CustomerPackageStatus | 'all';

interface WorkspaceState {
  pkg: CustomerPackage;
  mode: 'details' | 'schedule';
}

function CreatePackageFab({ onCreate }: { onCreate: () => void }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {open && <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        {open && (
          <button
            onClick={() => {
              setOpen(false);
              onCreate();
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-dark-surface border border-gold text-gold text-sm font-medium shadow-lg cursor-pointer whitespace-nowrap hover:bg-gold/10 transition-colors"
          >
            + Pacote
          </button>
        )}
        <button
          onClick={() => setOpen((value) => !value)}
          aria-label={open ? 'Fechar ações de pacote' : 'Abrir ações de pacote'}
          className="w-14 h-14 rounded-full bg-gold text-dark font-bold text-2xl shadow-lg cursor-pointer flex items-center justify-center transition-transform hover:scale-105 border-none"
        >
          {open ? '×' : '+'}
        </button>
      </div>
    </>
  );
}

function ConfirmDeactivateModal({
  pkg,
  onConfirm,
  onClose,
  isPending,
}: {
  pkg: CustomerPackage;
  onConfirm: () => void;
  onClose: () => void;
  isPending: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-dark-surface border border-dark-border rounded-2xl p-6 w-full max-w-sm">
        <h3 className="text-base font-bold mb-2">Desativar pacote?</h3>
        <p className="text-muted text-sm mb-6">
          {pkg.customerName} — {pkg.usedCount}/{pkg.totalUses} usos —{' '}
          {formatCurrency(pkg.totalPriceCents)}
        </p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isPending}
            className="flex-1 py-2.5 rounded-xl border border-dark-border text-muted hover:text-[#F0EDE8] transition-colors text-sm cursor-pointer bg-transparent disabled:opacity-50"
          >
            Voltar
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="flex-1 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-colors text-sm font-medium cursor-pointer disabled:opacity-50"
          >
            {isPending ? <Spinner /> : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PackagesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [search, setSearch] = useState('');
  const [showPackageModal, setShowPackageModal] = useState(false);
  const [deactivatingPkg, setDeactivatingPkg] = useState<CustomerPackage | null>(null);
  const [workspace, setWorkspace] = useState<WorkspaceState | null>(null);

  const { data: me } = useAdminMe();
  const { data: packages, isLoading } = useAdminPackages(statusFilter === 'all' ? undefined : statusFilter);
  const deactivate = useAdminDeactivatePackage();

  const filtered = (packages ?? []).filter((pkg) => {
    if (!search) return true;

    const query = search.toLowerCase();
    return (
      pkg.customerName.toLowerCase().includes(query) ||
      (pkg.customerPhone ?? '').includes(query)
    );
  });

  const filters: Array<{ label: string; value: StatusFilter }> = [
    { label: 'Ativos', value: 'active' },
    { label: 'Concluídos', value: 'completed' },
    { label: 'Cancelados', value: 'cancelled' },
    { label: 'Todos', value: 'all' },
  ];

  function openWorkspace(pkg: CustomerPackage, mode: 'details' | 'schedule') {
    setWorkspace({ pkg, mode });
  }

  function closeWorkspace() {
    queryClient.invalidateQueries({ queryKey: adminPackageQueryKeys.all });
    setWorkspace(null);
  }

  return (
    <div className="relative z-10 max-w-[680px] mx-auto px-5 py-8 pb-20">
      {workspace && (
        <PackageWorkspaceModal
          packageId={workspace.pkg.id}
          initialPackage={workspace.pkg}
          initialMode={workspace.mode}
          barberId={me?.id ?? null}
          onClose={closeWorkspace}
        />
      )}

      {showPackageModal && (
        <AdminPackageModal
          onClose={() => setShowPackageModal(false)}
          onCreated={(pkg) => setWorkspace({ pkg, mode: 'schedule' })}
        />
      )}

      {deactivatingPkg && (
        <ConfirmDeactivateModal
          pkg={deactivatingPkg}
          isPending={deactivate.isPending}
          onClose={() => setDeactivatingPkg(null)}
          onConfirm={() => {
            deactivate.mutate(deactivatingPkg.id, {
              onSuccess: () => setDeactivatingPkg(null),
            });
          }}
        />
      )}

      <CreatePackageFab onCreate={() => setShowPackageModal(true)} />

      <div className="flex items-center justify-between mb-8">
        <button
          onClick={() => navigate('/admin')}
          className="text-muted hover:text-[#F0EDE8] text-sm transition-colors cursor-pointer bg-transparent border-none flex items-center gap-1"
        >
          ← Voltar
        </button>
        <h1 className="font-serif text-base tracking-widest uppercase text-gold">Pacotes</h1>
        <div className="w-14" />
      </div>

      <div className="flex gap-1.5 mb-4 flex-wrap">
        {filters.map(({ label, value }) => (
          <button
            key={value}
            onClick={() => setStatusFilter(value)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer
              ${statusFilter === value
                ? 'border-gold bg-gold/20 text-gold'
                : 'border-dark-border bg-dark text-muted hover:border-gold/40'
              }`}
          >
            {label}
          </button>
        ))}
      </div>

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar por nome ou telefone..."
        className="w-full bg-dark border border-dark-border rounded-xl px-4 py-3 text-sm text-[#F0EDE8] placeholder-muted outline-none focus:border-gold mb-6"
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-20 gap-3 text-muted">
          <Spinner /> Carregando...
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-muted text-lg">Nenhum pacote encontrado.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((pkg) => (
            <div
              key={pkg.id}
              className="bg-dark-surface border border-dark-border rounded-xl p-5"
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <p className="font-medium text-sm">{pkg.customerName}</p>
                  {pkg.customerPhone && (
                    <p className="text-muted text-xs mt-0.5">+55 {pkg.customerPhone}</p>
                  )}
                </div>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full border shrink-0 ${STATUS_COLOR[pkg.status]}`}
                >
                  {STATUS_LABEL[pkg.status] ?? pkg.status}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm mb-3">
                <span className="text-muted text-xs">
                  {pkg.usedCount}/{pkg.totalUses} usos
                </span>
                <span className="font-medium text-gold">{formatCurrency(pkg.totalPriceCents)}</span>
                <span className="text-muted text-xs">
                  {new Date(pkg.createdAt).toLocaleDateString('pt-BR')}
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => openWorkspace(pkg, 'details')}
                  className="flex-1 min-w-[120px] py-2 rounded-lg bg-dark-surface2 border border-dark-border text-muted hover:text-[#F0EDE8] hover:border-gold/40 transition-colors cursor-pointer text-xs font-medium"
                >
                  Ver detalhes
                </button>

                {pkg.status === 'active' && pkg.usedCount < pkg.totalUses && (
                  <button
                    onClick={() => openWorkspace(pkg, 'schedule')}
                    className="flex-1 min-w-[120px] py-2 rounded-lg bg-gold/10 border border-gold/30 text-gold hover:bg-gold/20 transition-colors cursor-pointer text-xs font-medium"
                  >
                    Agendar uso
                  </button>
                )}

                {pkg.status === 'active' && (
                  <button
                    onClick={() => setDeactivatingPkg(pkg)}
                    className="flex-1 min-w-[120px] py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-colors cursor-pointer text-xs font-medium"
                  >
                    Desativar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
