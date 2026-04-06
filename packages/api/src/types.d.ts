import type { ClientEntity } from './domain/entities/client.js'

declare module 'fastify' {
  interface FastifyRequest {
    client: ClientEntity
  }
}
