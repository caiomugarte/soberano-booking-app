import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

export function registerCancelBooking(server: McpServer, apiBaseUrl: string, tenantSlug: string): void {
  server.tool(
    'cancel_booking',
    'Cancels a confirmed appointment. Requires the cancel token from get_my_appointments. Always ask the customer to confirm before calling.',
    {
      cancelToken: z.string().describe('Cancel token from get_my_appointments'),
      phoneLastFour: z.string().regex(/^\d{4}$/).describe('Last 4 digits of customer phone'),
    },
    async ({ cancelToken, phoneLastFour }) => {
      const response = await fetch(`${apiBaseUrl}/api/appointment/${encodeURIComponent(cancelToken)}/cancel`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-Tenant-Slug': tenantSlug },
        body: JSON.stringify({ phoneLastFour }),
      });

      if (response.status === 404) {
        const body = await response.json().catch(() => ({})) as { error?: string };
        if (body.error === 'TENANT_NOT_FOUND') {
          return { isError: true, content: [{ type: 'text' as const, text: 'Tenant não encontrado. Verifique a configuração do servidor MCP.' }] };
        }
        return {
          isError: true,
          content: [{ type: 'text' as const, text: 'Agendamento não encontrado.' }],
        };
      }

      if (response.status === 403) {
        const body = await response.json().catch(() => ({})) as { error?: string };
        if (body.error === 'TENANT_INACTIVE') {
          return { isError: true, content: [{ type: 'text' as const, text: 'Tenant inativo. Contate o suporte.' }] };
        }
      }

      if (response.status === 400) {
        let message = 'Erro de validação.';
        try {
          const body = await response.json() as { message?: string; error?: string };
          message = body.message ?? body.error ?? message;
        } catch {
          // ignore parse error
        }
        return {
          isError: true,
          content: [{ type: 'text' as const, text: message }],
        };
      }

      if (!response.ok) {
        return {
          isError: true,
          content: [{ type: 'text' as const, text: `API error: ${response.status}` }],
        };
      }

      return {
        content: [{ type: 'text' as const, text: 'Agendamento cancelado com sucesso.' }],
      };
    },
  );
}
