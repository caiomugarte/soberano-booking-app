import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { env } from './config/env.js';
import { registerListServices } from './tools/list-services.js';
import { registerListBarbers } from './tools/list-barbers.js';
import { registerGetAvailableSlots } from './tools/get-available-slots.js';
import { registerCreateBooking } from './tools/create-booking.js';
import { registerGetMyAppointments } from './tools/get-my-appointments.js';
import { registerCancelBooking } from './tools/cancel-booking.js';
import { registerRescheduleBooking } from './tools/reschedule-booking.js';
import { registerGetNextAvailableDate } from './tools/get-next-available-date.js';
import { registerBookBarberAbsence } from './tools/book-barber-absence.js';
import { registerListBarberAbsences } from './tools/list-barber-absences.js';
import { registerCancelBarberAbsence } from './tools/cancel-barber-absence.js';
import { registerEditBarberAbsence } from './tools/edit-barber-absence.js';
import { registerGetBarberAppointments } from './tools/get-barber-appointments.js';
import { registerGetBarberFinancialReport } from './tools/get-barber-financial-report.js';

const MCP_PATH_RE = /^\/mcp\/([^/?]+)/;

function createMcpServer(tenantSlug: string): McpServer {
  const server = new McpServer({ name: 'altion-mcp', version: '1.0.0' });
  registerListServices(server, env.apiBaseUrl, tenantSlug);
  registerListBarbers(server, env.apiBaseUrl, tenantSlug);
  registerGetAvailableSlots(server, env.apiBaseUrl, tenantSlug);
  registerCreateBooking(server, env.apiBaseUrl, tenantSlug);
  registerGetMyAppointments(server, env.apiBaseUrl, tenantSlug);
  registerCancelBooking(server, env.apiBaseUrl, tenantSlug);
  registerRescheduleBooking(server, env.apiBaseUrl, tenantSlug);
  registerGetNextAvailableDate(server, env.apiBaseUrl, tenantSlug);
  registerBookBarberAbsence(server, env.apiBaseUrl, env.internalApiSecret, tenantSlug);
  registerListBarberAbsences(server, env.apiBaseUrl, env.internalApiSecret, tenantSlug);
  registerCancelBarberAbsence(server, env.apiBaseUrl, env.internalApiSecret, tenantSlug);
  registerEditBarberAbsence(server, env.apiBaseUrl, env.internalApiSecret, tenantSlug);
  registerGetBarberAppointments(server, env.apiBaseUrl, env.internalApiSecret, tenantSlug);
  registerGetBarberFinancialReport(server, env.apiBaseUrl, env.internalApiSecret, tenantSlug);
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

  const match = req.url?.match(MCP_PATH_RE);
  if (!match) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'TENANT_SLUG_REQUIRED' }));
    return;
  }

  const tenantSlug = match[1];
  const body = req.method === 'POST' ? await readBody(req) : undefined;
  const server = createMcpServer(tenantSlug);
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  res.on('close', () => { server.close(); });
  await server.connect(transport);
  await transport.handleRequest(req, res, body);
});

httpServer.listen(env.port, () => {
  console.log(`MCP server listening on port ${env.port}`);
});
