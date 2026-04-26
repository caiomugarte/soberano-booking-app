import type { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../config/database.js';
import { createTenantPrisma } from '../../config/tenant-prisma.js';
import { TenantNotFoundError, TenantInactiveError } from '../../shared/errors.js';

export async function tenantMiddleware(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const slug = request.headers['x-tenant-slug'];

  if (!slug || typeof slug !== 'string') {
    const err = new TenantNotFoundError();
    return reply.status(err.statusCode).send({ error: err.code, message: err.message });
  }

  const tenant = await prisma.tenant.findUnique({ where: { slug } });

  if (!tenant) {
    const err = new TenantNotFoundError();
    return reply.status(err.statusCode).send({ error: err.code, message: err.message });
  }

  if (!tenant.isActive) {
    const err = new TenantInactiveError();
    return reply.status(err.statusCode).send({ error: err.code, message: err.message });
  }

  request.tenant = tenant;
  request.tenantPrisma = createTenantPrisma(tenant.id);
}
