import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export function registerListServices(server: McpServer, apiBaseUrl: string): void {
  server.tool(
    'list_services',
    'Lists all active services at Soberano Barbearia with name, duration, and price.',
    {},
    async () => {
      const response = await fetch(`${apiBaseUrl}/api/services`);
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
