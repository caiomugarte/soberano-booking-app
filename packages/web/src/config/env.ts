const slug = import.meta.env.VITE_TENANT_SLUG;

if (!slug && !import.meta.env.VITEST) {
  throw new Error('VITE_TENANT_SLUG environment variable is required');
}

export const TENANT_SLUG: string = slug ?? 'test';
