export interface ClientEntity {
  id: string
  slug: string
  name: string
  customDomain: string | null
  enabledFeatures: string[]
  theme: { primaryColor: string; primaryColorHover: string; logoUrl: string | null }
  baseUrl: string
  timezone: string
  isActive: boolean
  chatwootBaseUrl?: string | null
  chatwootToken?: string | null
  chatwootAccountId?: number | null
  chatwootInboxId?: number | null
}
