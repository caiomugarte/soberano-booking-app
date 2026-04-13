import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

function todayInCampoGrande(): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Campo_Grande' }).format(new Date());
}

export function registerGetNextAvailableDate(server: McpServer, apiBaseUrl: string): void {
  server.tool(
    'get_next_available_date',
    "Finds the earliest date with available slots for a barber (up to maxDaysAhead days). Use when a customer asks 'when is the next available slot?'",
    {
      barberId: z.string().uuid().describe('Barber ID from list_barbers'),
      fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('Start date in YYYY-MM-DD format (default: today in Campo Grande timezone)'),
      maxDaysAhead: z.number().int().min(1).max(60).optional().describe('Maximum days to scan (default: 30)'),
    },
    async ({ barberId, fromDate, maxDaysAhead }) => {
      const from = fromDate ?? todayInCampoGrande();
      const maxDays = maxDaysAhead ?? 30;

      const url = `${apiBaseUrl}/api/slots/next-available?barberId=${encodeURIComponent(barberId)}&from=${encodeURIComponent(from)}&maxDays=${maxDays}`;
      const response = await fetch(url);

      if (!response.ok) {
        return {
          isError: true,
          content: [{ type: 'text' as const, text: `API error: ${response.status}` }],
        };
      }

      const data = await response.json() as { date: string | null; slots: string[] };

      if (!data.date) {
        return {
          isError: true,
          content: [{ type: 'text' as const, text: `Nenhuma vaga encontrada nos próximos ${maxDays} dias.` }],
        };
      }

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(data) }],
      };
    },
  );
}
