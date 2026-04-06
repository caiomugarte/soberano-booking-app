import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../config/database.js';
import { comparePassword } from '../../infrastructure/auth/password.service.js';
import { PrismaClientRepository } from '../../infrastructure/database/repositories/prisma-client.repository.js';
import { generateSuperAdminToken, superAdminAuthGuard } from '../middleware/super-admin-auth.middleware.js';
import { PLAN_FEATURES } from '../../shared/features.js';
import { clearTenantCache } from '../plugins/tenant.plugin.js';

const clientRepo = new PrismaClientRepository();

const createClientSchema = z.object({
  slug: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
  baseUrl: z.string().url(),
  timezone: z.string().default('America/Sao_Paulo'),
  plan: z.enum(['site-only', 'ai']),
  customDomain: z.string().optional(),
  chatwootBaseUrl: z.string().url().optional(),
  chatwootToken: z.string().optional(),
  chatwootAccountId: z.coerce.number().optional(),
  chatwootInboxId: z.coerce.number().optional(),
});

export async function superAdminRoutes(app: FastifyInstance): Promise<void> {
  // POST /api/super-admin/login — exempt from tenant resolution
  app.post('/super-admin/login', {
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
    schema: {
      tags: ['Super Admin'],
      summary: 'Super-admin login',
      body: z.object({ email: z.string().email(), password: z.string().min(1) }),
      response: { 200: z.object({ accessToken: z.string() }) },
    },
  }, async (request, reply) => {
    const { email, password } = z.object({
      email: z.string().email(),
      password: z.string().min(1),
    }).parse(request.body);

    const admin = await prisma.superAdmin.findUnique({ where: { email } });
    if (!admin) {
      return reply.status(401).send({ error: 'UNAUTHORIZED', message: 'Email ou senha incorretos.' });
    }

    const valid = await comparePassword(password, admin.password);
    if (!valid) {
      return reply.status(401).send({ error: 'UNAUTHORIZED', message: 'Email ou senha incorretos.' });
    }

    const token = generateSuperAdminToken(admin.id);
    return { accessToken: token };
  });

  // Protected routes in a sub-scope so the guard doesn't apply to /login
  await app.register(async (guarded) => {
    guarded.addHook('onRequest', superAdminAuthGuard);

    // GET /api/super-admin/clients — list all clients
    guarded.get('/super-admin/clients', { schema: { tags: ['Super Admin'], summary: 'List all tenants', security: [{ bearerAuth: [] }] } }, async () => {
      return { clients: await clientRepo.findAll() };
    });

    // POST /api/super-admin/clients — create new client
    guarded.post('/super-admin/clients', { schema: { tags: ['Super Admin'], summary: 'Create new tenant', body: createClientSchema, security: [{ bearerAuth: [] }] } }, async (request, reply) => {
      const data = createClientSchema.parse(request.body);
      const { plan, ...rest } = data;
      const client = await clientRepo.create({
        ...rest,
        enabledFeatures: PLAN_FEATURES[plan],
        theme: { primaryColor: '#1a1a2e', primaryColorHover: '#16213e', logoUrl: null },
        isActive: true,
      });
      return reply.status(201).send({ client });
    });

    // PATCH /api/super-admin/clients/:id/features — update features
    guarded.patch<{ Params: { id: string } }>('/super-admin/clients/:id/features', { schema: { tags: ['Super Admin'], summary: 'Update tenant enabled features', params: z.object({ id: z.string() }), body: z.object({ features: z.array(z.string()) }), security: [{ bearerAuth: [] }] } }, async (request, reply) => {
      const { id } = request.params;
      const { features } = z.object({ features: z.array(z.string()) }).parse(request.body);
      await clientRepo.updateFeatures(id, features);
      clearTenantCache();
      return reply.status(200).send({ message: 'Features atualizadas.' });
    });
  });
}
