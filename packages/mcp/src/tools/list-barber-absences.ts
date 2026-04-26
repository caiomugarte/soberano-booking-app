import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

export function registerListBarberAbsences(server: McpServer, apiBaseUrl: string, internalApiSecret: string, tenantSlug: string): void {
  server.tool(
    'list_barber_absences',
    "Lists upcoming absences (day offs) registered for the barber. Use this before cancelling or editing an absence to find the absenceId. barberId is known from the workflow context — never ask the barber for it.",
    {
      barberId: z.string().uuid().describe('Barber ID'),
    },
    async ({ barberId }) => {
      const url = new URL(`${apiBaseUrl}/api/internal/provider-absences`);
      url.searchParams.set('barberId', barberId);

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'X-Internal-Secret': internalApiSecret,
          'X-Tenant-Slug': tenantSlug,
        },
      });

      if (response.status === 401) {
        return { isError: true, content: [{ type: 'text' as const, text: 'Configuração inválida. Contate o suporte.' }] };
      }

      if (response.status === 404) {
        return { isError: true, content: [{ type: 'text' as const, text: 'Barbeiro não encontrado.' }] };
      }

      if (!response.ok) {
        return { isError: true, content: [{ type: 'text' as const, text: `API error: ${response.status}` }] };
      }

      const data = await response.json();
      return { content: [{ type: 'text' as const, text: JSON.stringify(data) }] };
    },
  );
}
