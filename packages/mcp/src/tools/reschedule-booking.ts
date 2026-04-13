import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

export function registerRescheduleBooking(server: McpServer, apiBaseUrl: string, tenantSlug: string): void {
  server.tool(
    'reschedule_booking',
    'Reschedules an appointment to a new date and time. Requires the cancel token from get_my_appointments. Always confirm the new slot is available (get_available_slots) before calling.',
    {
      cancelToken: z.string().describe('Cancel token from get_my_appointments'),
      phoneLastFour: z.string().regex(/^\d{4}$/).describe('Last 4 digits of customer phone'),
      newDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('New date in YYYY-MM-DD format'),
      newStartTime: z.string().regex(/^\d{2}:\d{2}$/).describe('New start time in HH:mm format'),
    },
    async ({ cancelToken, phoneLastFour, newDate, newStartTime }) => {
      const response = await fetch(`${apiBaseUrl}/api/appointment/${encodeURIComponent(cancelToken)}/change`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-Tenant-Slug': tenantSlug },
        body: JSON.stringify({ phoneLastFour, date: newDate, startTime: newStartTime }),
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

      if (response.status === 409) {
        return {
          isError: true,
          content: [{ type: 'text' as const, text: 'Horário já ocupado. Tente outro horário.' }],
        };
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

      const data = await response.json();
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(data) }],
      };
    },
  );
}
