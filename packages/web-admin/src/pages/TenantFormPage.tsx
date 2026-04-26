import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { tenantConfigSchema } from '@soberano/shared';
import { platformRequest } from '../api/platform.ts';
import { AppShell } from '../components/AppShell.tsx';
import { Button } from '../components/Button.tsx';
import { Input } from '../components/Input.tsx';
import { Card } from '../components/Card.tsx';
import { Toggle } from '../components/Toggle.tsx';

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

function LockIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`transition-transform ${expanded ? 'rotate-180' : ''}`}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

const chatwootFields: { key: string; label: string }[] = [
  { key: 'chatwootBaseUrl', label: 'Base URL' },
  { key: 'chatwootApiToken', label: 'API Token' },
  { key: 'chatwootAccountId', label: 'Account ID' },
  { key: 'chatwootInboxId', label: 'Inbox ID' },
];

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
  const [chatwootExpanded, setChatwootExpanded] = useState(false);

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const setConfig = (key: string, value: string | undefined) => {
    setForm((f) => ({ ...f, config: { ...(f.config as any), [key]: value } }));
  };

  const config = (form.config ?? {}) as Record<string, string>;

  const tenantName = form.name ?? (isEdit ? '' : 'Novo Tenant');
  const breadcrumb = (
    <span>
      <span className="hover:text-white transition-colors cursor-pointer" onClick={() => navigate('/')}>Tenants</span>
      <span className="mx-2">/</span>
      <span className="text-white">{tenantName || 'Novo Tenant'}</span>
    </span>
  );

  return (
    <AppShell breadcrumb={breadcrumb}>
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Main fields */}
          <div className="lg:col-span-2">
            <Card title="Informações Gerais">
              <div className="space-y-4">
                <Input
                  label="Slug"
                  value={form.slug ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                  required={!isEdit}
                  disabled={isEdit}
                  placeholder="ex: minha-barbearia"
                  className="font-mono"
                  leftIcon={isEdit ? <LockIcon /> : undefined}
                />
                <Input
                  label="Nome"
                  value={form.name ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                />
                <div className="flex flex-col gap-1">
                  <label className="text-muted text-sm font-medium">Tipo</label>
                  <select
                    value={form.type ?? 'barbershop'}
                    onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                    className="w-full bg-dark-surface2 border border-dark-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-gold transition-colors"
                  >
                    <option value="barbershop">Barbearia</option>
                  </select>
                </div>
              </div>
            </Card>
          </div>

          {/* Right: Config + Integrations */}
          <div className="space-y-4">
            <Card title="Configuração">
              <div className="space-y-4">
                <Input
                  label="Nome do negócio"
                  value={config.businessName ?? ''}
                  onChange={(e) => setConfig('businessName', e.target.value)}
                  required
                />
                <Input
                  label="Label do prestador"
                  value={config.providerLabel ?? ''}
                  onChange={(e) => setConfig('providerLabel', e.target.value)}
                  required
                  placeholder="ex: Barbeiro"
                />
                <Input
                  label="URL de agendamento"
                  type="url"
                  value={config.bookingUrl ?? ''}
                  onChange={(e) => setConfig('bookingUrl', e.target.value)}
                  required
                />
              </div>
            </Card>

            {/* Chatwoot collapsible */}
            <div className="bg-dark-surface border border-dark-border rounded-xl">
              <button
                type="button"
                onClick={() => setChatwootExpanded((v) => !v)}
                className="w-full flex items-center justify-between px-6 py-4 text-left"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white">Chatwoot</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs border border-dark-border text-muted bg-dark-surface2">
                    opcional
                  </span>
                </div>
                <span className="text-muted">
                  <ChevronIcon expanded={chatwootExpanded} />
                </span>
              </button>
              {chatwootExpanded && (
                <>
                  <div className="border-t border-dark-border" />
                  <div className="p-6 space-y-4">
                    {chatwootFields.map(({ key, label }) => (
                      <Input
                        key={key}
                        label={label}
                        value={config[key] ?? ''}
                        onChange={(e) => setConfig(key, e.target.value || undefined)}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="mt-6 flex items-center justify-between">
          <Toggle
            label="Tenant Ativo"
            checked={form.isActive ?? true}
            onChange={(v) => setForm((f) => ({ ...f, isActive: v }))}
          />
          <div className="flex items-center gap-3">
            {error && <p className="text-sm text-red-400">{error}</p>}
            <Button type="button" variant="outline" size="md" onClick={() => navigate('/')}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" size="md" disabled={mutation.isPending}>
              {mutation.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </div>
      </form>
    </AppShell>
  );
}
