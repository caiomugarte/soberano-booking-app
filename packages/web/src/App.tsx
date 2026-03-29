import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import BookingPage from './pages/BookingPage.tsx';
import AppointmentPage from './pages/AppointmentPage.tsx';
import PrivacyPage from './pages/PrivacyPage.tsx';
import NotFoundPage from './pages/NotFoundPage.tsx';
import LoginPage from './pages/admin/LoginPage.tsx';
import DashboardPage from './pages/admin/DashboardPage.tsx';
import SchedulePage from './pages/admin/SchedulePage.tsx';
import { ProtectedRoute } from './components/admin/ProtectedRoute.tsx';
import { useAuthStore } from './stores/auth.store.ts';
import { Spinner } from './components/ui/Spinner.tsx';

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<BookingPage />} />
      <Route path="/agendamento/:token" element={<AppointmentPage />} />
      <Route path="/privacidade" element={<PrivacyPage />} />
      <Route path="/admin/login" element={<LoginPage />} />
      <Route path="/admin" element={
        <ProtectedRoute>
          <DashboardPage />
        </ProtectedRoute>
      } />
      <Route path="/admin/schedule" element={
        <ProtectedRoute>
          <SchedulePage />
        </ProtectedRoute>
      } />
      <Route path="/admin/*" element={<Navigate to="/admin" replace />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default function App() {
  const initialize = useAuthStore((s) => s.initialize);
  const isInitialized = useAuthStore((s) => s.isInitialized);

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
