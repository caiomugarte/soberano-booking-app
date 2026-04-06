import type { FastifyRequest, FastifyReply } from 'fastify';
import { verifyAccessToken } from '../../infrastructure/auth/jwt.service.js';
import { PrismaBarberRepository } from '../../infrastructure/database/repositories/prisma-barber.repository.js';

const barberRepo = new PrismaBarberRepository();

export async function authGuard(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return reply.status(401).send({ error: 'UNAUTHORIZED', message: 'Token não fornecido.' });
  }

  try {
    const token = authHeader.slice(7);
    const payload = verifyAccessToken(token);
    const barber = await barberRepo.findById(payload.barberId, request.client.id);
    if (!barber) {
      return reply.status(403).send({ error: 'TENANT_MISMATCH', message: 'Acesso não autorizado.' });
    }
    (request as FastifyRequest & { barberId: string }).barberId = payload.barberId;
  } catch {
    return reply.status(401).send({ error: 'UNAUTHORIZED', message: 'Token inválido ou expirado.' });
  }
}
