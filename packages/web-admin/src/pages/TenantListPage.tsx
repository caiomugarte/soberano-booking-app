import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { platformRequest } from '../api/platform.ts';
import { AppShell } from '../components/AppShell.tsx';
import { Button } from '../components/Button.tsx';
import { Badge } from '../components/Badge.tsx';
import { Skeleton } from '../components/Skeleton.tsx';
import { Card } from '../components/Card.tsx';

interface Tenant {
  id: string;
  slug: string;
  name: string;
  type: string;
  isActive: boolean;
}

export function TenantListPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['tenants'],
    queryFn: () => platformRequest<{ tenants: Tenant[] }>('/tenants'),
  });

  return (
    <AppShell
      breadcrumb="Tenants"
      actions={
        <Link to="/tenants/new" className="w-full sm:w-auto">
          <Button variant="primary" size="sm" className="w-full sm:w-auto">
            + Novo Tenant
          </Button>
        </Link>
      }
    >
      {isLoading ? (
        <>
          <div className="space-y-3 md:hidden">
            {[0, 1, 2].map((i) => (
              <Card key={i}>
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2">
                      <Skeleton height="h-3" width="w-20" />
                      <Skeleton height="h-4" width="w-40" />
                    </div>
                    <Skeleton height="h-6" width="w-16" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Skeleton height="h-3" width="w-16" />
                      <Skeleton height="h-3" width="w-20" />
                    </div>
                    <div className="space-y-2">
                      <Skeleton height="h-3" width="w-16" />
                      <Skeleton height="h-3" width="w-16" />
                    </div>
                  </div>
                  <Skeleton height="h-8" width="w-24" />
                </div>
              </Card>
            ))}
          </div>
          <div className="hidden overflow-hidden rounded-xl border border-dark-border bg-dark-surface md:block">
            <div className="h-10 border-b border-dark-border bg-dark-surface2 px-6 py-3" />
            <div className="divide-y divide-dark-border">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-6 px-6 py-4">
                  <Skeleton height="h-3" width="w-20" />
                  <Skeleton height="h-3" width="w-36" />
                  <Skeleton height="h-3" width="w-20" />
                  <Skeleton height="h-3" width="w-14" />
                </div>
              ))}
            </div>
          </div>
        </>
      ) : !data?.tenants.length ? (
        <Card>
          <div className="text-center py-8">
            <p className="text-muted text-sm mb-4">Nenhum tenant cadastrado ainda.</p>
            <Link to="/tenants/new">
              <Button variant="primary">Criar primeiro tenant</Button>
            </Link>
          </div>
        </Card>
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {data.tenants.map((tenant) => (
              <Card key={tenant.id}>
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-mono text-xs text-muted">{tenant.slug}</p>
                      <p className="mt-1 text-base font-medium text-white">{tenant.name}</p>
                    </div>
                    <Badge variant={tenant.isActive ? 'active' : 'inactive'}>
                      {tenant.isActive ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs uppercase tracking-widest text-muted">Tipo</p>
                      <p className="mt-1 text-white">{tenant.type}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-widest text-muted">Status</p>
                      <p className="mt-1 text-white">{tenant.isActive ? 'Ativo' : 'Inativo'}</p>
                    </div>
                  </div>
                  <Link
                    to={`/tenants/${tenant.id}`}
                    className="inline-flex text-xs font-medium text-gold transition-colors hover:text-gold-light"
                  >
                    Editar
                  </Link>
                </div>
              </Card>
            ))}
          </div>

          <div className="hidden overflow-hidden rounded-xl border border-dark-border bg-dark-surface md:block">
            <table className="w-full text-sm">
              <thead className="bg-dark-surface2 border-b border-dark-border">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-muted uppercase tracking-widest">Slug</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-muted uppercase tracking-widest">Nome</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-muted uppercase tracking-widest">Tipo</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-muted uppercase tracking-widest">Status</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody>
                {data.tenants.map((tenant) => (
                  <tr key={tenant.id} className="border-b border-dark-border last:border-0 hover:bg-dark-surface2 transition-colors">
                    <td className="px-6 py-4 font-mono text-white text-xs">{tenant.slug}</td>
                    <td className="px-6 py-4 text-white">{tenant.name}</td>
                    <td className="px-6 py-4 text-muted">{tenant.type}</td>
                    <td className="px-6 py-4">
                      <Badge variant={tenant.isActive ? 'active' : 'inactive'}>
                        {tenant.isActive ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link to={`/tenants/${tenant.id}`} className="text-gold hover:underline text-xs font-medium">
                        Editar
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </AppShell>
  );
}
