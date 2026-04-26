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
        <Link to="/tenants/new">
          <Button variant="primary" size="sm">+ Novo Tenant</Button>
        </Link>
      }
    >
      {isLoading ? (
        <div className="bg-dark-surface border border-dark-border rounded-xl overflow-hidden">
          <div className="bg-dark-surface2 px-6 py-3 border-b border-dark-border h-10" />
          <div className="divide-y divide-dark-border">
            {[0, 1, 2].map((i) => (
              <div key={i} className="px-6 py-4 flex gap-6 items-center">
                <Skeleton height="h-3" width="w-20" />
                <Skeleton height="h-3" width="w-36" />
                <Skeleton height="h-3" width="w-20" />
                <Skeleton height="h-3" width="w-14" />
              </div>
            ))}
          </div>
        </div>
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
        <div className="bg-dark-surface border border-dark-border rounded-xl overflow-hidden">
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
      )}
    </AppShell>
  );
}
