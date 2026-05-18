import type { FastifyInstance } from 'fastify';
import { PrismaServiceRepository } from '../../infrastructure/database/repositories/prisma-service.repository.js';

export async function serviceRoutes(app: FastifyInstance): Promise<void> {
  app.get('/services', async (request) => {
    const serviceRepo = new PrismaServiceRepository(request.tenantPrisma);
    const services = await serviceRepo.findAllActive();

    if (request.tenant.slug !== 'bruno') {
      return { services };
    }

    const normalized = new Map<string, typeof services[number]>();
    for (const service of services) {
      const slug =
        ['individual', 'couple', 'family', 'casal', 'familiar', 'psychotherapy'].includes(service.slug)
          ? 'psychotherapy'
          : service.slug;

      if (!['psychotherapy', 'neuromodulation'].includes(slug)) {
        continue;
      }

      const normalizedService = {
        ...service,
        slug,
        name: slug === 'psychotherapy' ? 'Psicoterapia' : 'Neuromodulação',
        icon: slug === 'psychotherapy' ? '🧠' : '⚡',
        sortOrder: slug === 'psychotherapy' ? 1 : 2,
      };

      if (!normalized.has(slug) || service.slug === slug) {
        normalized.set(slug, normalizedService);
      }
    }

    return {
      services: Array.from(normalized.values()).sort((left, right) => left.sortOrder - right.sortOrder),
    };
  });
}
