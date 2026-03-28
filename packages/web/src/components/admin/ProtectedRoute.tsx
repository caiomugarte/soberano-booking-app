import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store.ts';
import type { ReactNode } from 'react';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const accessToken = useAuthStore((s) => s.accessToken);
  if (!accessToken) return <Navigate to="/admin/login" replace />;
  return <>{children}</>;
}
