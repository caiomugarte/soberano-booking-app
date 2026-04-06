import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export function registerListBarbers(server: McpServer, apiBaseUrl: string): void {
  server.tool(
    'list_barbers',
    'Lists all active barbers with their names and working days of the week (0=Sunday … 6=Saturday).',
    {},
    async () => {
      const response = await fetch(`${apiBaseUrl}/barbers`);
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
