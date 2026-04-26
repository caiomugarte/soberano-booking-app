// Mock VITE_TENANT_SLUG for tests
Object.defineProperty(import.meta, 'env', {
  value: {
    ...import.meta.env,
    VITE_TENANT_SLUG: 'test',
  },
  writable: true,
});

import '@testing-library/jest-dom';
