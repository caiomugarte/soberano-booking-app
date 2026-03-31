import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useLogin } from '../../api/use-admin.ts';
import { useAuthStore } from '../../stores/auth.store.ts';
import { Button } from '../../components/ui/Button.tsx';
import { Input } from '../../components/ui/Input.tsx';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const login = useLogin();
  const accessToken = useAuthStore((s) => s.accessToken);

  if (accessToken) return <Navigate to="/admin" replace />;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await login.mutateAsync({ email, password });
    navigate('/admin');
  }

  return (
    <div className="relative z-10 min-h-screen flex items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="inline-flex flex-col items-center gap-2 mb-5">
            <img src="/logo.png" alt="Soberano Barbearia" className="w-16 h-16 object-contain" />
            <span className="font-serif text-[15px] tracking-[0.25em] uppercase text-gold">Soberano Barbearia</span>
          </div>
          <h1 className="font-serif text-3xl font-black">Área do <em className="not-italic text-gold">Barbeiro</em></h1>
        </div>

        <form onSubmit={handleSubmit} className="bg-dark-surface border border-dark-border rounded-2xl p-7">
          <Input
            label="Email"
            type="email"
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
          <Input
            label="Senha"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />

          {login.isError && (
            <p className="text-red-400 text-sm mb-4 text-center">
              {(login.error as Error).message}
            </p>
          )}

          <Button type="submit" loading={login.isPending} disabled={!email || !password}>
            Entrar
          </Button>
        </form>
      </div>
    </div>
  );
}
