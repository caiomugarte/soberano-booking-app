import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminPackages, useAdminDeactivatePackage, useAdminDeletePackage, useAdminMe, type CustomerPackage } from '../../api/use-admin.ts';
import { Spinner } from '../../components/ui/Spinner.tsx';
import { formatCurrency } from '../../lib/format.ts';
import { BookFromPackageModal } from '../../components/admin/BookFromPackageModal.tsx';

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

type StatusFilter = '' | 'active' | 'completed' | 'cancelled';

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

function ConfirmDeleteModal({
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
        <h3 className="text-base font-bold mb-2">Apagar pacote?</h3>
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
            {isPending ? <Spinner /> : '✕ Apagar'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PackagesPage() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');
  const [search, setSearch] = useState('');
  const [deactivatingPkg, setDeactivatingPkg] = useState<CustomerPackage | null>(null);
  const [deletingPkg, setDeletingPkg] = useState<CustomerPackage | null>(null);
  const [schedulingPkg, setSchedulingPkg] = useState<CustomerPackage | null>(null);

  const { data: packages, isLoading } = useAdminPackages(statusFilter || undefined);
  const { data: me } = useAdminMe();
  const deactivate = useAdminDeactivatePackage();
  const deletePkg = useAdminDeletePackage();

  const filtered = (packages ?? []).filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      p.customerName.toLowerCase().includes(q) ||
      (p.customerPhone ?? '').includes(q)
    );
  });

  const FILTERS: { label: string; value: StatusFilter }[] = [
    { label: 'Todos', value: '' },
    { label: 'Ativos', value: 'active' },
    { label: 'Concluídos', value: 'completed' },
    { label: 'Cancelados', value: 'cancelled' },
  ];

  return (
    <div className="relative z-10 max-w-[680px] mx-auto px-5 py-8 pb-20">
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
      {deletingPkg && (
        <ConfirmDeleteModal
          pkg={deletingPkg}
          isPending={deletePkg.isPending}
          onClose={() => setDeletingPkg(null)}
          onConfirm={() => {
            deletePkg.mutate(deletingPkg.id, {
              onSuccess: () => setDeletingPkg(null),
            });
          }}
        />
      )}
      {schedulingPkg && (
        <BookFromPackageModal
          pkg={schedulingPkg}
          barberId={me?.id ?? null}
          onClose={() => setSchedulingPkg(null)}
        />
      )}

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
        {FILTERS.map(({ label, value }) => (
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
          {filtered.map((p) => (
            <div
              key={p.id}
              className="bg-dark-surface border border-dark-border rounded-xl p-5"
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <p className="font-medium text-sm">{p.customerName}</p>
                  {p.customerPhone && (
                    <p className="text-muted text-xs mt-0.5">+55 {p.customerPhone}</p>
                  )}
                </div>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full border shrink-0 ${STATUS_COLOR[p.status]}`}
                >
                  {STATUS_LABEL[p.status] ?? p.status}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm mb-3">
                <span className="text-muted text-xs">
                  {p.usedCount}/{p.totalUses} usos
                </span>
                <span className="font-medium text-gold">{formatCurrency(p.totalPriceCents)}</span>
                <span className="text-muted text-xs">
                  {new Date(p.createdAt).toLocaleDateString('pt-BR')}
                </span>
              </div>
              {p.status === 'active' && p.usedCount < p.totalUses && (
                <button
                  onClick={() => setSchedulingPkg(p)}
                  className="w-full py-2 rounded-lg border border-gold text-gold hover:bg-gold/10 transition-colors cursor-pointer text-xs font-medium mb-2"
                >
                  + Agendar ({p.totalUses - p.usedCount} restante{p.totalUses - p.usedCount !== 1 ? 's' : ''})
                </button>
              )}
              {p.status === 'active' && (
                <button
                  onClick={() => setDeactivatingPkg(p)}
                  className="w-full py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-colors cursor-pointer text-xs font-medium"
                >
                  Desativar
                </button>
              )}
              {p.status === 'cancelled' && (
                <button
                  onClick={() => setDeletingPkg(p)}
                  className="w-full py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-colors cursor-pointer text-xs font-medium"
                >
                  ✕ Apagar
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
