import type { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';

interface SuperAdminJwtPayload {
  superAdminId: string;
}

export function generateSuperAdminToken(superAdminId: string): string {
  const secret = env.SUPER_ADMIN_JWT_SECRET;
  if (!secret) throw new Error('SUPER_ADMIN_JWT_SECRET not configured');
  return jwt.sign({ superAdminId }, secret, { expiresIn: '24h' });
}

export async function superAdminAuthGuard(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return reply.status(401).send({ error: 'UNAUTHORIZED', message: 'Token não fornecido.' });
  }

  const secret = env.SUPER_ADMIN_JWT_SECRET;
  if (!secret) {
    return reply.status(500).send({ error: 'INTERNAL_ERROR', message: 'Super-admin não configurado.' });
  }

  try {
    const token = authHeader.slice(7);
    const payload = jwt.verify(token, secret) as SuperAdminJwtPayload;
    (request as FastifyRequest & { superAdminId: string }).superAdminId = payload.superAdminId;
  } catch {
    return reply.status(401).send({ error: 'UNAUTHORIZED', message: 'Token inválido ou expirado.' });
  }
}
