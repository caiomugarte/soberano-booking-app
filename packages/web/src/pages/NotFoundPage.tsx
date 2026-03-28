import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="relative z-10 flex flex-col items-center justify-center min-h-screen text-center px-5">
      <h1 className="font-serif text-6xl font-black text-gold mb-4">404</h1>
      <p className="text-muted text-lg mb-8">Página não encontrada.</p>
      <Link to="/" className="text-gold underline hover:text-gold-light">
        Voltar ao início
      </Link>
    </div>
  );
}
