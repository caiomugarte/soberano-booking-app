import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './stores/auth.store.ts';
import { LoginPage } from './pages/LoginPage.tsx';
import { TenantListPage } from './pages/TenantListPage.tsx';
import { TenantFormPage } from './pages/TenantFormPage.tsx';

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<ProtectedRoute><TenantListPage /></ProtectedRoute>} />
          <Route path="/tenants/new" element={<ProtectedRoute><TenantFormPage /></ProtectedRoute>} />
          <Route path="/tenants/:id" element={<ProtectedRoute><TenantFormPage /></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
