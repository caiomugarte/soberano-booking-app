import type { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';

export async function platformAuthMiddleware(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return reply.status(401).send({ error: 'UNAUTHORIZED', message: 'Token não fornecido.' });
  }

  try {
    const token = authHeader.slice(7);
    jwt.verify(token, env.SUPER_ADMIN_JWT_SECRET);
  } catch {
    return reply.status(401).send({ error: 'UNAUTHORIZED', message: 'Token inválido ou expirado.' });
  }
}
