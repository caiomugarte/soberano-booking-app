import { prisma } from './database.js';

const TENANT_SCOPED_MODELS = new Set([
  'provider',
  'providerShift',
  'providerAbsence',
  'service',
  'customer',
  'appointment',
]);

const CREATE_OPERATIONS = new Set(['create', 'createMany', 'createManyAndReturn', 'upsert']);

export type TenantPrismaClient = ReturnType<typeof createTenantPrisma>;

export function createTenantPrisma(tenantId: string) {
  return prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!model || !TENANT_SCOPED_MODELS.has(model)) {
            return query(args);
          }

          const typedArgs = args as Record<string, unknown>;

          if (CREATE_OPERATIONS.has(operation)) {
            if (operation === 'createMany' || operation === 'createManyAndReturn') {
              const data = typedArgs['data'];
              if (Array.isArray(data)) {
                typedArgs['data'] = data.map((item) => ({ ...item, tenantId }));
              }
            } else if (operation === 'upsert') {
              const create = typedArgs['create'] as Record<string, unknown> | undefined;
              const where = typedArgs['where'] as Record<string, unknown> | undefined;
              typedArgs['create'] = { ...create, tenantId };
              typedArgs['where'] = { ...where, tenantId };
            } else {
              const data = typedArgs['data'] as Record<string, unknown> | undefined;
              typedArgs['data'] = { ...data, tenantId };
            }
          } else {
            const where = typedArgs['where'] as Record<string, unknown> | undefined;
            typedArgs['where'] = { ...where, tenantId };
          }

          return query(typedArgs);
        },
      },
    },
  });
}
