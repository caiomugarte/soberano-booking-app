import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

export async function clientRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/client/config — public, returns tenant theme + features
  app.get('/client/config', {
    schema: {
      tags: ['Client'],
      summary: 'Get tenant configuration (public)',
      response: {
        200: z.object({
          name: z.string(),
          timezone: z.string(),
          enabledFeatures: z.array(z.string()),
          theme: z.any(),
        }),
      },
    },
  }, async (request) => {
    const { name, timezone, enabledFeatures, theme } = request.client;
    return { name, timezone, enabledFeatures, theme };
  });
}
