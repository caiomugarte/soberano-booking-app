import type { FastifyInstance } from 'fastify';
import { barberLoginSchema } from '@soberano/shared';
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

export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.post('/auth/login', {
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
  }, async (request, reply) => {
    const input = barberLoginSchema.parse(request.body);
    const providerRepo = new PrismaProviderRepository(request.tenantPrisma);
    const useCase = new AuthenticateBarber(providerRepo);
    const { accessToken, refreshToken } = await useCase.execute(input.email, input.password);

    reply.setCookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS);
    return { accessToken };
  });

  app.post('/auth/logout', async (_request, reply) => {
    reply.clearCookie('refreshToken', { path: '/api/auth/refresh' });
    return { message: 'Logout realizado.' };
  });

  app.post('/auth/refresh', async (request, reply) => {
    const token = request.cookies.refreshToken;
    if (!token) {
      return reply.status(401).send({ error: 'UNAUTHORIZED', message: 'Refresh token não fornecido.' });
    }

    try {
      const payload = verifyRefreshToken(token);
      const accessToken = generateAccessToken(payload.providerId, payload.tenantId);
      const newRefreshToken = generateRefreshToken(payload.providerId, payload.tenantId);

      reply.setCookie('refreshToken', newRefreshToken, REFRESH_COOKIE_OPTIONS);
      return { accessToken };
    } catch {
      return reply.status(401).send({ error: 'UNAUTHORIZED', message: 'Refresh token inválido.' });
    }
  });
}
