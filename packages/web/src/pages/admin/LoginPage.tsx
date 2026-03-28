import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLogin } from '../../api/use-admin.ts';
import { Button } from '../../components/ui/Button.tsx';
import { Input } from '../../components/ui/Input.tsx';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const login = useLogin();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await login.mutateAsync({ email, password });
    navigate('/admin');
  }

  return (
    <div className="relative z-10 min-h-screen flex items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2.5 mb-5">
            <svg viewBox="0 0 24 24" className="w-7 h-7 fill-gold" xmlns="http://www.w3.org/2000/svg">
              <path d="M9.5 3C8.1 3 7 4.1 7 5.5c0 .9.5 1.7 1.2 2.2L5 19h2l.8-3h8.4l.8 3h2L15.8 7.7c.7-.5 1.2-1.3 1.2-2.2C17 4.1 15.9 3 14.5 3c-.8 0-1.5.4-2 1h-1c-.5-.6-1.2-1-2-1zm0 2c.3 0 .5.2.5.5S9.8 6 9.5 6 9 5.8 9 5.5 9.2 5 9.5 5zm5 0c.3 0 .5.2.5.5S14.8 6 14.5 6 14 5.8 14 5.5s.2-.5.5-.5zM12 7.5l.2.5h-2l.2-.5h1.6zM8.2 14l1.1-4h5.4l1.1 4H8.2z" />
            </svg>
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
