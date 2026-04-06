import { BookingWizard } from '../components/booking/BookingWizard.tsx';
import { Footer } from '@soberano/ui';

export default function BookingPage() {
  return (
    <div className="relative z-10 max-w-[680px] mx-auto px-5 py-10 pb-40">
      <header className="text-center mb-[52px]">
        <a href="/" className="inline-flex flex-col items-center gap-2 mb-5 hover:opacity-80 transition-opacity">
          <img src="/logo.png" alt="Soberano Barbearia" className="w-44 h-44 sm:w-36 sm:h-36 object-contain" />
          <span className="font-serif text-[15px] tracking-[0.25em] uppercase text-gold">Soberano Barbearia</span>
        </a>
        <h1 className="font-serif text-[clamp(36px,8vw,56px)] font-black leading-[1.05] tracking-[-0.02em]">
          Agende seu<br /><em className="not-italic text-gold">horário</em>
        </h1>
        <p className="mt-3.5 text-muted text-[15px] font-light tracking-[0.02em]">
          Escolha o serviço e o melhor horário para você
        </p>
      </header>

      <BookingWizard />
      <Footer />
    </div>
  );
}
