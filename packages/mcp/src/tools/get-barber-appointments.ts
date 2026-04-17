import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

export function registerGetBarberAppointments(server: McpServer, apiBaseUrl: string, internalApiSecret: string, tenantSlug: string): void {
  server.tool(
    'get_barber_appointments',
    "Returns confirmed appointments for a barber on a specific date. Use this before registering an absence to check if the barber has clients booked during that period and alert him accordingly. barberId is known from the workflow context — never ask the barber for it.",
    {
      barberId: z.string().uuid().describe('Barber ID'),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('Date in YYYY-MM-DD format'),
    },
    async ({ barberId, date }) => {
      const url = new URL(`${apiBaseUrl}/api/internal/provider-appointments`);
      url.searchParams.set('barberId', barberId);
      url.searchParams.set('date', date);

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
