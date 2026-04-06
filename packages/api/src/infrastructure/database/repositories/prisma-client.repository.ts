import { prisma } from '../../../config/database.js'
import type { ClientEntity } from '../../../domain/entities/client.js'
import type { ClientRepository, CreateClientData } from '../../../domain/repositories/client.repository.js'

export class PrismaClientRepository implements ClientRepository {
  async findBySlug(slug: string): Promise<ClientEntity | null> {
    return prisma.client.findUnique({ where: { slug } }) as unknown as ClientEntity | null
  }

  async findByCustomDomain(domain: string): Promise<ClientEntity | null> {
    return prisma.client.findUnique({ where: { customDomain: domain } }) as unknown as ClientEntity | null
  }

  async findAll(): Promise<ClientEntity[]> {
    return prisma.client.findMany({ orderBy: { name: 'asc' } }) as unknown as ClientEntity[]
  }

  async create(data: CreateClientData): Promise<ClientEntity> {
    return prisma.client.create({ data }) as unknown as ClientEntity
  }

  async updateFeatures(id: string, features: string[]): Promise<void> {
    await prisma.client.update({ where: { id }, data: { enabledFeatures: features } })
  }
}
