import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

export function registerEditBarberAbsence(server: McpServer, apiBaseUrl: string, internalApiSecret: string, tenantSlug: string): void {
  server.tool(
    'edit_barber_absence',
    "Edits an existing barber absence — change the date, times, or reason. Use list_barber_absences first to find the absenceId. Only provide the fields you want to change. To remove startTime/endTime (make full-day), pass null. barberId is known from the workflow context — never ask the barber for it.",
    {
      barberId: z.string().uuid().describe('Barber ID'),
      absenceId: z.string().uuid().describe('Absence ID to edit'),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('New date in YYYY-MM-DD format'),
      startTime: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional().describe('New start time in HH:mm, or null to make full-day'),
      endTime: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional().describe('New end time in HH:mm, or null to make full-day'),
      reason: z.string().max(200).nullable().optional().describe('New reason, or null to clear it'),
    },
    async ({ barberId, absenceId, date, startTime, endTime, reason }) => {
      const response = await fetch(`${apiBaseUrl}/api/internal/provider-absences/${absenceId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Secret': internalApiSecret,
          'X-Tenant-Slug': tenantSlug,
        },
        body: JSON.stringify({ barberId, date, startTime, endTime, reason }),
      });

      if (response.status === 401) {
        return { isError: true, content: [{ type: 'text' as const, text: 'Configuração inválida. Contate o suporte.' }] };
      }

      if (response.status === 404) {
        const body = await response.json().catch(() => ({})) as { error?: string };
        if (body.error === 'NOT_FOUND') {
          return { isError: true, content: [{ type: 'text' as const, text: 'Ausência não encontrada.' }] };
        }
        return { isError: true, content: [{ type: 'text' as const, text: 'Barbeiro não encontrado.' }] };
      }

      if (response.status === 400) {
        let message = 'Erro de validação.';
        try {
          const body = await response.json() as { message?: string; error?: string };
          message = body.message ?? body.error ?? message;
        } catch {
          // ignore parse error
        }
        return { isError: true, content: [{ type: 'text' as const, text: message }] };
      }

      if (!response.ok) {
        return { isError: true, content: [{ type: 'text' as const, text: `API error: ${response.status}` }] };
      }

      const data = await response.json();
      return { content: [{ type: 'text' as const, text: JSON.stringify(data) }] };
    },
  );
}
