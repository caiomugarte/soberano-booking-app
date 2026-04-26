import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLogin } from '../hooks/useLogin.ts';
import { Button } from '../components/Button.tsx';
import { Input } from '../components/Input.tsx';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const login = useLogin();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login.mutateAsync({ email, password });
      navigate('/');
    } catch {
      // error shown below
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark">
      <div className="w-full max-w-sm px-4">
        <div className="bg-dark-surface border border-dark-border rounded-2xl shadow-xl p-8 animate-fadeUp">
          <div className="text-center mb-8">
            <h1 className="font-serif text-2xl text-gold">Altion</h1>
            <p className="text-muted text-sm mt-1">Platform Admin</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
            <Input
              label="Senha"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
            {login.error && (
              <p className="text-sm text-red-400">{login.error.message}</p>
            )}
            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full mt-2"
              disabled={login.isPending}
            >
              {login.isPending ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
