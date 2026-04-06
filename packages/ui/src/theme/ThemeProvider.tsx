import { useEffect, type ReactNode } from 'react';
import type { ClientTheme } from './types';

interface ThemeProviderProps {
  theme: ClientTheme;
  children: ReactNode;
}

export function ThemeProvider({ theme, children }: ThemeProviderProps) {
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--color-primary', theme.primaryColor);
    root.style.setProperty('--color-primary-hover', theme.primaryColorHover);
  }, [theme.primaryColor, theme.primaryColorHover]);

  return <>{children}</>;
}
