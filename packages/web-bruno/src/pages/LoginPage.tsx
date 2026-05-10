import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth.store'
import { LoginForm } from '@/components/auth/LoginForm'

export default function LoginPage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  if (isAuthenticated) return <Navigate to="/" replace />

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm px-4">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-500 text-2xl font-bold text-white shadow-lg">
            P
          </div>
          <h1 className="text-xl font-semibold text-gray-800">Bruno Morghetti</h1>
          <p className="mt-1 text-sm text-gray-500">Painel do Psicólogo</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <LoginForm />
        </div>
      </div>
    </div>
  )
}
