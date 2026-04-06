import { z } from 'zod';

const schema = z.object({
  PORT: z.string().default('3002'),
  API_BASE_URL: z.string().url(),
  MCP_SECRET: z.string().min(1),
});

const parsed = schema.parse(process.env);

export const env = {
  port: parseInt(parsed.PORT, 10),
  apiBaseUrl: parsed.API_BASE_URL,
  mcpSecret: parsed.MCP_SECRET,
};
