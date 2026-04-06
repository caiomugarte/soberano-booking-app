import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { barberLoginSchema } from '@soberano/shared';
import { PrismaBarberRepository } from '../../infrastructure/database/repositories/prisma-barber.repository.js';
import { AuthenticateBarber } from '../../application/use-cases/barber/authenticate-barber.js';
import { verifyRefreshToken, generateAccessToken, generateRefreshToken } from '../../infrastructure/auth/jwt.service.js';

const barberRepo = new PrismaBarberRepository();

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
    schema: {
      tags: ['Auth'],
      summary: 'Barber login — returns access token',
      body: barberLoginSchema,
      response: { 200: z.object({ accessToken: z.string() }) },
    },
  }, async (request, reply) => {
    const input = barberLoginSchema.parse(request.body);
    const useCase = new AuthenticateBarber(barberRepo);
    const { accessToken, refreshToken } = await useCase.execute(input.email, input.password, request.client.id);

    reply.setCookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS);
    return { accessToken };
  });

  app.post('/auth/logout', {
    schema: {
      tags: ['Auth'],
      summary: 'Logout — clears refresh token cookie',
      response: { 200: z.object({ message: z.string() }) },
    },
  }, async (_request, reply) => {
    reply.clearCookie('refreshToken', { path: '/api/auth/refresh' });
    return { message: 'Logout realizado.' };
  });

  app.post('/auth/refresh', {
    schema: {
      tags: ['Auth'],
      summary: 'Refresh access token using cookie',
      response: {
        200: z.object({ accessToken: z.string() }),
        401: z.object({ error: z.string(), message: z.string() }),
      },
    },
  }, async (request, reply) => {
    const token = request.cookies.refreshToken;
    if (!token) {
      return reply.status(401).send({ error: 'UNAUTHORIZED', message: 'Refresh token não fornecido.' });
    }

    try {
      const payload = verifyRefreshToken(token);
      const accessToken = generateAccessToken(payload.barberId);
      const newRefreshToken = generateRefreshToken(payload.barberId);

      reply.setCookie('refreshToken', newRefreshToken, REFRESH_COOKIE_OPTIONS);
      return { accessToken };
    } catch {
      return reply.status(401).send({ error: 'UNAUTHORIZED', message: 'Refresh token inválido.' });
    }
  });
}
