import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { env } from './config/env.js';
import { registerListServices } from './tools/list-services.js';
import { registerListBarbers } from './tools/list-barbers.js';
import { registerGetAvailableSlots } from './tools/get-available-slots.js';
import { registerCreateBooking } from './tools/create-booking.js';

const mcpServer = new McpServer({ name: 'soberano-mcp', version: '1.0.0' });

registerListServices(mcpServer, env.apiBaseUrl);
registerListBarbers(mcpServer, env.apiBaseUrl);
registerGetAvailableSlots(mcpServer, env.apiBaseUrl);
registerCreateBooking(mcpServer, env.apiBaseUrl);

function unauthorized(res: ServerResponse): void {
  res.writeHead(401, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Unauthorized' }));
}

const httpServer = createServer(async (req: IncomingMessage, res: ServerResponse) => {
  const authHeader = req.headers['authorization'];
  if (authHeader !== `Bearer ${env.mcpSecret}`) {
    unauthorized(res);
    return;
  }

  if (req.url === '/mcp') {
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    await mcpServer.connect(transport);
    await transport.handleRequest(req, res);
    return;
  }

  res.writeHead(404);
  res.end();
});

httpServer.listen(env.port, () => {
  console.log(`MCP server listening on port ${env.port}`);
});
