import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

export function registerGetAvailableSlots(server: McpServer, apiBaseUrl: string, tenantSlug: string): void {
  server.tool(
    'get_available_slots',
    'Returns available time slots for a specific barber on a specific date.',
    {
      barberId: z.string().uuid().describe('Barber ID from list_barbers'),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('Date in YYYY-MM-DD format'),
    },
    async ({ barberId, date }) => {
      const url = `${apiBaseUrl}/api/slots?barberId=${encodeURIComponent(barberId)}&date=${encodeURIComponent(date)}`;
      const response = await fetch(url, {
        headers: { 'X-Tenant-Slug': tenantSlug },
      });
      if (!response.ok) {
        const body = await response.json().catch(async () => {
          const text = await response.text().catch(() => '');
          return { _rawText: text };
        }) as { error?: string; _rawText?: string };
        if (response.status === 404 && body.error === 'TENANT_NOT_FOUND') {
          return { isError: true, content: [{ type: 'text' as const, text: 'Tenant não encontrado. Verifique a configuração do servidor MCP.' }] };
        }
        if (response.status === 403 && body.error === 'TENANT_INACTIVE') {
          return { isError: true, content: [{ type: 'text' as const, text: 'Tenant inativo. Contate o suporte.' }] };
        }
        return {
          isError: true,
          content: [{ type: 'text' as const, text: `API error ${response.status}: ${body._rawText ?? JSON.stringify(body)}` }],
        };
      }
      const data = await response.json();
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(data) }],
      };
    },
  );
}
