import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
// NOTE: package.json has 'bcryptjs' (not 'bcrypt') — ensure bcryptjs is installed
import bcrypt from 'bcryptjs';
import { env } from '../../config/env.js';
import { prisma } from '../../config/database.js';
import { platformAuthMiddleware } from '../middleware/platform-auth.middleware.js';

const tenantCreateSchema = z.object({
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/),
  name: z.string().min(1).max(200),
  type: z.string().default('barbershop'),
  config: z.object({
    businessName: z.string(),
    providerLabel: z.string(),
    bookingUrl: z.string().url(),
    chatwootBaseUrl: z.string().url().optional(),
    chatwootApiToken: z.string().optional(),
    chatwootAccountId: z.coerce.number().optional(),
    chatwootInboxId: z.coerce.number().optional(),
  }),
  isActive: z.boolean().default(true),
});

const tenantUpdateSchema = tenantCreateSchema.omit({ slug: true }).partial();

export async function platformRoutes(app: FastifyInstance): Promise<void> {
  // POST /api/platform/auth — no auth required (registered in parent scope)
  app.post('/auth', {
    config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
  }, async (request, reply) => {
    const body = z.object({
      email: z.string().email(),
      password: z.string(),
    }).parse(request.body);

    if (body.email !== env.SUPER_ADMIN_EMAIL) {
      return reply.status(401).send({ error: 'UNAUTHORIZED', message: 'Credenciais inválidas.' });
    }

    const valid = await bcrypt.compare(body.password, env.SUPER_ADMIN_PASSWORD_HASH);
    if (!valid) {
      return reply.status(401).send({ error: 'UNAUTHORIZED', message: 'Credenciais inválidas.' });
    }

    const token = jwt.sign({ role: 'super_admin' }, env.SUPER_ADMIN_JWT_SECRET, { expiresIn: '8h' });
    return reply.send({ token });
  });

  // All routes below require platform auth (child scope)
  await app.register(async (protected_) => {
    protected_.addHook('preHandler', platformAuthMiddleware);

    // GET /api/platform/tenants
    protected_.get('/tenants', async (_request, reply) => {
      const tenants = await prisma.tenant.findMany({
        select: { id: true, slug: true, name: true, type: true, isActive: true, config: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      });
      return reply.send({ tenants });
    });

    // GET /api/platform/tenants/:id
    protected_.get('/tenants/:id', async (request, reply) => {
      const { id } = request.params as { id: string };
      const tenant = await prisma.tenant.findUnique({ where: { id } });
      if (!tenant) return reply.status(404).send({ error: 'NOT_FOUND', message: 'Tenant não encontrado.' });
      return reply.send({ tenant });
    });

    // POST /api/platform/tenants
    protected_.post('/tenants', async (request, reply) => {
      const data = tenantCreateSchema.parse(request.body);

      const existing = await prisma.tenant.findUnique({ where: { slug: data.slug } });
      if (existing) {
        return reply.status(409).send({ error: 'CONFLICT', message: 'Slug já está em uso.' });
      }

      const tenant = await prisma.tenant.create({
        data: {
          slug: data.slug,
          name: data.name,
          type: data.type,
          config: data.config,
          isActive: data.isActive,
        },
      });
      return reply.status(201).send({ tenant });
    });

    // PATCH /api/platform/tenants/:id
    protected_.patch('/tenants/:id', async (request, reply) => {
      const { id } = request.params as { id: string };
      const data = tenantUpdateSchema.parse(request.body);

      const existing = await prisma.tenant.findUnique({ where: { id } });
      if (!existing) return reply.status(404).send({ error: 'NOT_FOUND', message: 'Tenant não encontrado.' });

      const tenant = await prisma.tenant.update({
        where: { id },
        data: {
          ...(data.name !== undefined && { name: data.name }),
          ...(data.type !== undefined && { type: data.type }),
          ...(data.config !== undefined && { config: data.config }),
          ...(data.isActive !== undefined && { isActive: data.isActive }),
        },
      });
      return reply.send({ tenant });
    });
  });
}
