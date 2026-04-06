import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { ClientConfig } from './types';
import { ThemeProvider } from './ThemeProvider';

const ClientConfigContext = createContext<ClientConfig | null>(null);

export function ClientConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<ClientConfig | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/client/config')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<ClientConfig>;
      })
      .then(setConfig)
      .catch((err) => {
        console.error('[ClientConfig] Failed to fetch client config:', err);
        setError(String(err));
      });
  }, []);

  if (error) {
    console.error('[ClientConfig] Error:', error);
  }

  if (!config) return null;

  return (
    <ClientConfigContext.Provider value={config}>
      <ThemeProvider theme={config.theme}>
        {children}
      </ThemeProvider>
    </ClientConfigContext.Provider>
  );
}

export function useClientConfig(): ClientConfig {
  const ctx = useContext(ClientConfigContext);
  if (!ctx) throw new Error('useClientConfig must be used within ClientConfigProvider');
  return ctx;
}
