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

export function registerCreateBooking(server: McpServer, apiBaseUrl: string, tenantSlug: string): void {
  server.tool(
    'create_booking',
    'Creates an appointment for the customer. Confirm service, barber, date, and time before calling.',
    {
      serviceId: z.string().uuid().describe('Service ID from list_services'),
      barberId: z.string().uuid().describe('Barber ID from list_barbers'),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('Date in YYYY-MM-DD format'),
      startTime: z.string().regex(/^\d{2}:\d{2}$/).describe('Start time in HH:mm format'),
      customerName: z.string().min(1).describe("Customer's full name"),
      customerPhone: z.string().describe('Customer phone number (may include +55 country code)'),
    },
    async ({ serviceId, barberId, date, startTime, customerName, customerPhone }) => {
      const phone = normalizePhone(customerPhone);

      const response = await fetch(`${apiBaseUrl}/api/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Tenant-Slug': tenantSlug },
        body: JSON.stringify({ serviceId, barberId, date, startTime, customerName, customerPhone: phone }),
      });

      if (response.status === 404) {
        const body = await response.json().catch(() => ({})) as { error?: string };
        if (body.error === 'TENANT_NOT_FOUND') {
          return { isError: true, content: [{ type: 'text' as const, text: 'Tenant não encontrado. Verifique a configuração do servidor MCP.' }] };
        }
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
          content: [{ type: 'text' as const, text: 'Horário já ocupado. Verifique outros horários disponíveis.' }],
        };
      }

      if (response.status === 400) {
        let message = 'Validation error';
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
