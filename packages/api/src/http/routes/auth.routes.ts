import type { FastifyInstance } from 'fastify';
import { barberLoginSchema } from '@soberano/shared';
import { prisma } from '../../config/database.js';
import { PrismaProviderRepository } from '../../infrastructure/database/repositories/prisma-provider.repository.js';
import { AuthenticateBarber } from '../../application/use-cases/barber/authenticate-barber.js';
import { verifyRefreshToken, generateAccessToken, generateRefreshToken } from '../../infrastructure/auth/jwt.service.js';

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/api/auth/refresh',
  maxAge: 7 * 24 * 60 * 60, // 7 days
};

function refreshCookieName(slug: string | string[] | undefined): string {
  return slug && typeof slug === 'string' ? `refreshToken_${slug}` : 'refreshToken';
}

export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.post('/auth/login', {
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
  }, async (request, reply) => {
    const input = barberLoginSchema.parse(request.body);
    const providerRepo = new PrismaProviderRepository(request.tenantPrisma);
    const useCase = new AuthenticateBarber(providerRepo);
    const { accessToken, refreshToken } = await useCase.execute(input.email, input.password);

    const cookieName = refreshCookieName(request.tenant.slug);
    reply.setCookie(cookieName, refreshToken, REFRESH_COOKIE_OPTIONS);
    return { accessToken };
  });

  app.post('/auth/logout', async (request, reply) => {
    const cookieName = refreshCookieName(request.headers['x-tenant-slug']);
    reply.clearCookie(cookieName, { path: '/api/auth/refresh' });
    return { message: 'Logout realizado.' };
  });

  app.post('/auth/refresh', async (request, reply) => {
    const slug = request.headers['x-tenant-slug'];
    const cookieName = refreshCookieName(slug);
    const token = request.cookies[cookieName];
    if (!token) {
      return reply.status(401).send({ error: 'UNAUTHORIZED', message: 'Refresh token não fornecido.' });
    }

    try {
      const payload = verifyRefreshToken(token);

      if (slug && typeof slug === 'string') {
        const tenant = await prisma.tenant.findUnique({ where: { slug } });
        if (!tenant || tenant.id !== payload.tenantId) {
          return reply.status(401).send({ error: 'UNAUTHORIZED', message: 'Token não pertence a este tenant.' });
        }
      }

      const accessToken = generateAccessToken(payload.providerId, payload.tenantId);
      const newRefreshToken = generateRefreshToken(payload.providerId, payload.tenantId);

      reply.setCookie(cookieName, newRefreshToken, REFRESH_COOKIE_OPTIONS);
      return { accessToken };
    } catch {
      return reply.status(401).send({ error: 'UNAUTHORIZED', message: 'Refresh token inválido.' });
    }
  });
}
