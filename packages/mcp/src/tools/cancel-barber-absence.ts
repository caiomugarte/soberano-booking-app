import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

export function registerCancelBarberAbsence(server: McpServer, apiBaseUrl: string, internalApiSecret: string, tenantSlug: string): void {
  server.tool(
    'cancel_barber_absence',
    "Cancels (removes) a registered barber absence. Use list_barber_absences first to find the absenceId. barberId is known from the workflow context — never ask the barber for it.",
    {
      barberId: z.string().uuid().describe('Barber ID'),
      absenceId: z.string().uuid().describe('Absence ID to cancel'),
    },
    async ({ barberId, absenceId }) => {
      const response = await fetch(`${apiBaseUrl}/api/internal/provider-absences/${absenceId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Secret': internalApiSecret,
          'X-Tenant-Slug': tenantSlug,
        },
        body: JSON.stringify({ barberId }),
      });

      if (response.status === 401) {
        return { isError: true, content: [{ type: 'text' as const, text: 'Configuração inválida. Contate o suporte.' }] };
      }

      if (response.status === 404) {
        return { isError: true, content: [{ type: 'text' as const, text: 'Ausência não encontrada.' }] };
      }

      if (!response.ok) {
        return { isError: true, content: [{ type: 'text' as const, text: `API error: ${response.status}` }] };
      }

      return { content: [{ type: 'text' as const, text: 'Ausência cancelada com sucesso.' }] };
    },
  );
}
