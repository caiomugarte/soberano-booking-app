import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

export function registerBookBarberAbsence(server: McpServer, apiBaseUrl: string, internalApiSecret: string): void {
  server.tool(
    'book_barber_absence',
    "Registers a barber absence (day off). Use when the barber says they won't be working on a specific date. barberId is known from the workflow context — never ask the barber for it.",
    {
      barberId: z.string().uuid().describe('Barber ID'),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('Date in YYYY-MM-DD format'),
      startTime: z.string().regex(/^\d{2}:\d{2}$/).optional().describe('Start time in HH:mm (omit for full-day absence)'),
      endTime: z.string().regex(/^\d{2}:\d{2}$/).optional().describe('End time in HH:mm (omit for full-day absence)'),
      reason: z.string().max(200).optional().describe('Optional reason for absence'),
    },
    async ({ barberId, date, startTime, endTime, reason }) => {
      const response = await fetch(`${apiBaseUrl}/api/internal/provider-absences`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Secret': internalApiSecret,
        },
        body: JSON.stringify({ barberId, date, startTime, endTime, reason }),
      });

      if (response.status === 401) {
        return {
          isError: true,
          content: [{ type: 'text' as const, text: 'Configuração inválida. Contate o suporte.' }],
        };
      }

      if (response.status === 404) {
        return {
          isError: true,
          content: [{ type: 'text' as const, text: 'Barbeiro não encontrado.' }],
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
