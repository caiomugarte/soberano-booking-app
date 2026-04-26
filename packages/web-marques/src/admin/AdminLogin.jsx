import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './admin.css';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    // Por enquanto, login simples sem backend
    if (email && password) {
      localStorage.setItem('admin_logged', 'true');
      navigate('/admin/dashboard');
    }
  };

  return (
    <div className="admin-page admin-login">
      <img src="/logo.jpg" alt="Barbearia da Marquês" className="admin-login-logo" />
      <h2>Barbearia da Marquês</h2>
      <p className="subtitle">Área do <span>Barbeiro</span></p>

      <form className="admin-login-form" onSubmit={handleLogin}>
        <div>
          <label>Email</label>
          <input
            type="email"
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label>Senha</label>
          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button type="submit" className="admin-login-btn">Entrar</button>
      </form>
    </div>
  );
}
