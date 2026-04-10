import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { platformRequest } from '../api/platform.ts';

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
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Tenants</h1>
        <Link
          to="/tenants/new"
          className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800"
        >
          Novo Tenant
        </Link>
      </div>

      {isLoading ? (
        <p className="text-gray-500 text-sm">Carregando...</p>
      ) : !data?.tenants.length ? (
        <p className="text-gray-500 text-sm">Nenhum tenant cadastrado.</p>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Slug</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Nome</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Tipo</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {data.tenants.map((tenant) => (
                <tr key={tenant.id} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-3 font-mono text-gray-800">{tenant.slug}</td>
                  <td className="px-4 py-3 text-gray-800">{tenant.name}</td>
                  <td className="px-4 py-3 text-gray-600">{tenant.type}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${tenant.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                      {tenant.isActive ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link to={`/tenants/${tenant.id}`} className="text-gray-900 hover:underline text-xs font-medium">
                      Editar
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
