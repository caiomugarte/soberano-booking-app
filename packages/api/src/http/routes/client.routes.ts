import type { FastifyInstance } from 'fastify';

export async function clientRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/client/config — public, returns tenant theme + features
  app.get('/client/config', async (request) => {
    const { name, timezone, enabledFeatures, theme } = request.client;
    return { name, timezone, enabledFeatures, theme };
  });
}
