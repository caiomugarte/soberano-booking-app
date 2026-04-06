import type { ClientEntity } from '../entities/client.js'

export interface CreateClientData {
  slug: string
  name: string
  customDomain?: string | null
  enabledFeatures: string[]
  theme: { primaryColor: string; primaryColorHover: string; logoUrl: string | null }
  baseUrl: string
  timezone: string
  isActive?: boolean
  chatwootBaseUrl?: string | null
  chatwootToken?: string | null
  chatwootAccountId?: number | null
  chatwootInboxId?: number | null
}

export interface ClientRepository {
  findBySlug(slug: string): Promise<ClientEntity | null>
  findByCustomDomain(domain: string): Promise<ClientEntity | null>
  findAll(): Promise<ClientEntity[]>
  create(data: CreateClientData): Promise<ClientEntity>
  updateFeatures(id: string, features: string[]): Promise<void>
}
