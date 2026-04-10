import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { tenantConfigSchema } from '@soberano/shared';
import { platformRequest } from '../api/platform.ts';

const formSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/).optional(),
  type: z.string().default('barbershop'),
  isActive: z.boolean().default(true),
  config: tenantConfigSchema,
});

type FormData = z.infer<typeof formSchema>;

interface Tenant {
  id: string;
  slug: string;
  name: string;
  type: string;
  isActive: boolean;
  config: unknown;
}

export function TenantFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id && id !== 'new';
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [form, setForm] = useState<Partial<FormData & { slug: string }>>({
    type: 'barbershop',
    isActive: true,
    config: { businessName: '', providerLabel: 'Barbeiro', bookingUrl: '' },
  });
  const [error, setError] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ['tenant', id],
    queryFn: () => platformRequest<{ tenant: Tenant }>(`/tenants/${id}`),
    enabled: isEdit,
  });

  useEffect(() => {
    if (data?.tenant) {
      const t = data.tenant;
      const parsed = tenantConfigSchema.safeParse(t.config);
      setForm({
        name: t.name,
        slug: t.slug,
        type: t.type,
        isActive: t.isActive,
        config: parsed.success ? parsed.data : { businessName: '', providerLabel: '', bookingUrl: '' },
      });
    }
  }, [data]);

  const mutation = useMutation({
    mutationFn: async (formData: typeof form) => {
      if (isEdit) {
        return platformRequest(`/tenants/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(formData),
        });
      } else {
        return platformRequest('/tenants', {
          method: 'POST',
          body: JSON.stringify(formData),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      navigate('/');
    },
    onError: (err: Error) => setError(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    mutation.mutate(form);
  };

  const setConfig = (key: string, value: string | number | undefined) => {
    setForm((f) => ({ ...f, config: { ...(f.config as object), [key]: value } }));
  };

  const config = (form.config ?? {}) as Record<string, string>;

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        {isEdit ? 'Editar Tenant' : 'Novo Tenant'}
      </h1>
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow p-6 space-y-4">
        {!isEdit && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
            <input type="text" value={form.slug ?? ''} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
              required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="ex: minha-barbearia" />
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
          <input type="text" value={form.name ?? ''} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
          <select value={form.type ?? 'barbershop'} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
            <option value="barbershop">Barbearia</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nome do negócio</label>
          <input type="text" value={config.businessName ?? ''} onChange={(e) => setConfig('businessName', e.target.value)}
            required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Label do prestador</label>
          <input type="text" value={config.providerLabel ?? ''} onChange={(e) => setConfig('providerLabel', e.target.value)}
            required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="ex: Barbeiro" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">URL de agendamento</label>
          <input type="url" value={config.bookingUrl ?? ''} onChange={(e) => setConfig('bookingUrl', e.target.value)}
            required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        <hr className="border-gray-200" />
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Chatwoot (opcional)</p>
        {['chatwootBaseUrl', 'chatwootApiToken', 'chatwootAccountId', 'chatwootInboxId'].map((key) => (
          <div key={key}>
            <label className="block text-sm font-medium text-gray-700 mb-1">{key}</label>
            <input type="text" value={config[key] ?? ''} onChange={(e) => setConfig(key, e.target.value || undefined)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
        ))}
        <div className="flex items-center gap-2">
          <input type="checkbox" id="isActive" checked={form.isActive ?? true}
            onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} className="rounded" />
          <label htmlFor="isActive" className="text-sm font-medium text-gray-700">Ativo</label>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={mutation.isPending}
            className="bg-gray-900 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50">
            {mutation.isPending ? 'Salvando...' : 'Salvar'}
          </button>
          <button type="button" onClick={() => navigate('/')}
            className="border border-gray-300 text-gray-700 px-6 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
