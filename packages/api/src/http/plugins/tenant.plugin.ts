import type { FastifyRequest, FastifyReply } from 'fastify'
import type { ClientEntity } from '../../domain/entities/client.js'
import { PrismaClientRepository } from '../../infrastructure/database/repositories/prisma-client.repository.js'

const clientRepo = new PrismaClientRepository()
const cache = new Map<string, ClientEntity>()

const EXEMPT_PATHS = ['/api/health', '/api/super-admin/login']

export async function tenantMiddleware(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  if (EXEMPT_PATHS.includes(request.url) || request.url.startsWith('/api/super-admin/') || request.url.startsWith('/docs')) {
    return
  }

  const host = request.headers.host?.split(':')[0] ?? ''

  if (cache.has(host)) {
    request.client = cache.get(host)!
    return
  }

  // 1. Try customDomain
  let client = await clientRepo.findByCustomDomain(host)

  // 2. Fall back to subdomain: soberano.altion.com.br → soberano
  if (!client) {
    const slug = host.split('.')[0]
    client = await clientRepo.findBySlug(slug)
  }

  if (!client || !client.isActive) {
    return reply.status(503).send({ error: 'CLIENT_NOT_FOUND', message: 'Cliente não encontrado.' })
  }

  cache.set(host, client)
  request.client = client
}

export function invalidateTenantCache(host: string): void {
  cache.delete(host)
}

export function clearTenantCache(): void {
  cache.clear()
}
