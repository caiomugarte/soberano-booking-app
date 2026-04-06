import type { FastifyRequest, FastifyReply } from 'fastify'
import type { FeatureKey } from '../../shared/features.js'

export function requireFeature(feature: FeatureKey) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const client = (request as FastifyRequest & { client?: { enabledFeatures: string[] } }).client
    if (!client || !client.enabledFeatures.includes(feature)) {
      return reply.status(403).send({
        error: 'FEATURE_NOT_ENABLED',
        message: 'Funcionalidade não disponível neste plano.',
      })
    }
  }
}
