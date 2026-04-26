import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export function registerListServices(server: McpServer, apiBaseUrl: string, tenantSlug: string): void {
  server.tool(
    'list_services',
    'Lists all active services at Soberano Barbearia with name, duration, and price.',
    {},
    async () => {
      const response = await fetch(`${apiBaseUrl}/api/services`, {
        headers: { 'X-Tenant-Slug': tenantSlug },
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({})) as { error?: string };
        if (response.status === 404 && body.error === 'TENANT_NOT_FOUND') {
          return { isError: true, content: [{ type: 'text' as const, text: 'Tenant não encontrado. Verifique a configuração do servidor MCP.' }] };
        }
        if (response.status === 403 && body.error === 'TENANT_INACTIVE') {
          return { isError: true, content: [{ type: 'text' as const, text: 'Tenant inativo. Contate o suporte.' }] };
        }
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
