import { z } from 'zod';

const schema = z.object({
  PORT: z.string().default('3002'),
  API_BASE_URL: z.string().url(),
  MCP_SECRET: z.string().min(1),
  INTERNAL_API_SECRET: z.string().min(16),
});

const parsed = schema.parse(process.env);

export const env = {
  port: parseInt(parsed.PORT, 10),
  apiBaseUrl: parsed.API_BASE_URL,
  mcpSecret: parsed.MCP_SECRET,
  internalApiSecret: parsed.INTERNAL_API_SECRET,
};
