import { BookingWizard } from '../components/booking/BookingWizard.tsx';

export default function BookingPage() {
  return (
    <div className="relative z-10 max-w-[680px] mx-auto px-5 py-10 pb-20">
      <header className="text-center mb-[52px]">
        <div className="inline-flex items-center gap-2.5 mb-5">
          <svg viewBox="0 0 24 24" className="w-7 h-7 fill-gold" xmlns="http://www.w3.org/2000/svg">
            <path d="M9.5 3C8.1 3 7 4.1 7 5.5c0 .9.5 1.7 1.2 2.2L5 19h2l.8-3h8.4l.8 3h2L15.8 7.7c.7-.5 1.2-1.3 1.2-2.2C17 4.1 15.9 3 14.5 3c-.8 0-1.5.4-2 1h-1c-.5-.6-1.2-1-2-1zm0 2c.3 0 .5.2.5.5S9.8 6 9.5 6 9 5.8 9 5.5 9.2 5 9.5 5zm5 0c.3 0 .5.2.5.5S14.8 6 14.5 6 14 5.8 14 5.5s.2-.5.5-.5zM12 7.5l.2.5h-2l.2-.5h1.6zM8.2 14l1.1-4h5.4l1.1 4H8.2z" />
          </svg>
          <span className="font-serif text-[15px] tracking-[0.25em] uppercase text-gold">Soberano Barbearia</span>
        </div>
        <h1 className="font-serif text-[clamp(36px,8vw,56px)] font-black leading-[1.05] tracking-[-0.02em]">
          Agende seu<br /><em className="not-italic text-gold">horário</em>
        </h1>
        <p className="mt-3.5 text-muted text-[15px] font-light tracking-[0.02em]">
          Escolha o serviço e o melhor horário para você
        </p>
      </header>

      <BookingWizard />
    </div>
  );
}
