import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { env } from './config/env.js';
import { registerListServices } from './tools/list-services.js';
import { registerListBarbers } from './tools/list-barbers.js';
import { registerGetAvailableSlots } from './tools/get-available-slots.js';
import { registerCreateBooking } from './tools/create-booking.js';

function createMcpServer(): McpServer {
  const server = new McpServer({ name: 'soberano-mcp', version: '1.0.0' });
  registerListServices(server, env.apiBaseUrl);
  registerListBarbers(server, env.apiBaseUrl);
  registerGetAvailableSlots(server, env.apiBaseUrl);
  registerCreateBooking(server, env.apiBaseUrl);
  return server;
}

function isAuthorized(authHeader: string | undefined): boolean {
  if (!authHeader) return false;
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
  return token === env.mcpSecret;
}

function unauthorized(res: ServerResponse): void {
  res.writeHead(401, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Unauthorized' }));
}

async function readBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string));
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

const httpServer = createServer(async (req: IncomingMessage, res: ServerResponse) => {
  if (!isAuthorized(req.headers['authorization'])) {
    unauthorized(res);
    return;
  }

  if (req.url === '/mcp' || req.url?.startsWith('/mcp?')) {
    const body = req.method === 'POST' ? await readBody(req) : undefined;
    const server = createMcpServer();
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on('close', () => { server.close(); });
    await server.connect(transport);
    await transport.handleRequest(req, res, body);
    return;
  }

  res.writeHead(404);
  res.end();
});

httpServer.listen(env.port, () => {
  console.log(`MCP server listening on port ${env.port}`);
});
