import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

function normalizePhone(raw: string): string {
  let phone = raw.replace(/\s+/g, '');
  if (phone.startsWith('+55')) {
    const stripped = phone.slice(3);
    if (stripped.length >= 10 && stripped.length <= 11) return stripped;
  }
  if (phone.startsWith('55') && phone.length >= 12 && phone.length <= 13) {
    const stripped = phone.slice(2);
    if (stripped.length >= 10 && stripped.length <= 11) return stripped;
  }
  return phone;
}

export function registerGetMyAppointments(server: McpServer, apiBaseUrl: string): void {
  server.tool(
    'get_my_appointments',
    'Retrieves the customer\'s next upcoming appointment by phone number. Call this before cancel or reschedule actions.',
    {
      customerPhone: z.string().describe('Customer phone number (may include +55 country code)'),
    },
    async ({ customerPhone }) => {
      const phone = normalizePhone(customerPhone);

      const response = await fetch(`${apiBaseUrl}/api/appointments/by-phone?phone=${encodeURIComponent(phone)}`);

      if (response.status === 400) {
        return {
          isError: true,
          content: [{ type: 'text' as const, text: 'Telefone inválido.' }],
        };
      }

      if (!response.ok) {
        return {
          isError: true,
          content: [{ type: 'text' as const, text: `API error: ${response.status}` }],
        };
      }

      const data = await response.json() as { appointment: unknown };
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(data) }],
      };
    },
  );
}
