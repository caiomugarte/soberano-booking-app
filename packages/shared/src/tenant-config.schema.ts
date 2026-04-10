import { z } from 'zod';

export const tenantConfigSchema = z.object({
  businessName: z.string(),
  providerLabel: z.string(),
  bookingUrl: z.string().url(),
  chatwootBaseUrl: z.string().url().optional(),
  chatwootApiToken: z.string().optional(),
  chatwootAccountId: z.coerce.number().optional(),
  chatwootInboxId: z.coerce.number().optional(),
});

export type TenantConfig = z.infer<typeof tenantConfigSchema>;
