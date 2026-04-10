import type { FastifyRequest, FastifyReply } from 'fastify';
import { verifyAccessToken } from '../../infrastructure/auth/jwt.service.js';

export async function authGuard(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return reply.status(401).send({ error: 'UNAUTHORIZED', message: 'Token não fornecido.' });
  }

  try {
    const token = authHeader.slice(7);
    const payload = verifyAccessToken(token);
    (request as FastifyRequest & { providerId: string }).providerId = payload.providerId;
  } catch {
    return reply.status(401).send({ error: 'UNAUTHORIZED', message: 'Token inválido ou expirado.' });
  }
}
