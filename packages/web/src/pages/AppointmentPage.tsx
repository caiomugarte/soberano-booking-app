import { useParams, Link } from 'react-router-dom';
import { AppointmentView } from '../components/appointment/AppointmentView.tsx';

export default function AppointmentPage() {
  const { token } = useParams<{ token: string }>();

  return (
    <div className="relative z-10 max-w-[680px] mx-auto px-5 py-10 pb-20">
      <header className="text-center mb-10">
        <Link to="/" className="inline-flex flex-col items-center gap-2 mb-5 hover:opacity-80 transition-opacity">
          <img src="/logo.png" alt="Soberano Barbearia" className="w-16 h-16 object-contain" />
          <span className="font-serif text-[15px] tracking-[0.25em] uppercase text-gold">Soberano Barbearia</span>
        </Link>
        <h1 className="font-serif text-[clamp(28px,6vw,40px)] font-black leading-[1.1]">
          Seu <em className="not-italic text-gold">agendamento</em>
        </h1>
      </header>

      {token ? <AppointmentView token={token} /> : <p className="text-center text-muted">Token inválido.</p>}
    </div>
  );
}
