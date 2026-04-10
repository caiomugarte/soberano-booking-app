import type { Tenant } from '@prisma/client';
import type { TenantPrismaClient } from '../config/tenant-prisma.js';

declare module 'fastify' {
  interface FastifyRequest {
    tenant: Tenant;
    tenantPrisma: TenantPrismaClient;
    providerId?: string;
  }
}
