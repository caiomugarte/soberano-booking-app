import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

export function registerGetBarberFinancialReport(server: McpServer, apiBaseUrl: string, internalApiSecret: string, tenantSlug: string): void {
  server.tool(
    'get_barber_financial_report',
    "Returns a financial report for a barber within a date range. Includes per-day stats (confirmed appointments, completed appointments, revenue) and period totals. barberId is known from the workflow context — never ask the barber for it.",
    {
      barberId: z.string().uuid().describe('Barber ID'),
      from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('Start date in YYYY-MM-DD format (inclusive)'),
      to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('End date in YYYY-MM-DD format (inclusive)'),
    },
    async ({ barberId, from, to }) => {
      const url = new URL(`${apiBaseUrl}/api/internal/provider-stats`);
      url.searchParams.set('barberId', barberId);
      url.searchParams.set('from', from);
      url.searchParams.set('to', to);

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
