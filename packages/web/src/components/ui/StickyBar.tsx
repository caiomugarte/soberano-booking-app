import { Spinner } from './Spinner.tsx';

interface StickyBarProps {
  visible: boolean;
  onNext: () => void;
  onBack?: () => void;
  icon?: string;
  label: string;
  sublabel?: string;
  nextLabel?: string;
  loading?: boolean;
}

export function StickyBar({
  visible,
  onNext,
  onBack,
  icon,
  label,
  sublabel,
  nextLabel = 'Continuar →',
  loading = false,
}: StickyBarProps) {
  return (
    <div className={`fixed bottom-0 left-0 right-0 z-50 bg-[#0C0C0C] transition-[transform,opacity] duration-300 ease-in-out ${visible ? 'translate-y-0 opacity-100 pointer-events-auto' : 'translate-y-full opacity-0 pointer-events-none'}`}>
      <div className="max-w-[680px] mx-auto px-5 pb-6 pt-3">
        <div className="flex items-stretch bg-gold text-dark rounded-xl shadow-[0_-8px_32px_rgba(0,0,0,0.5)] overflow-hidden">
          {onBack && (
            <>
              <button
                onClick={onBack}
                className="flex-shrink-0 px-4 flex items-center justify-center hover:bg-black/10 transition-colors cursor-pointer"
                aria-label="Voltar"
              >
                <span className="text-lg font-bold">←</span>
              </button>
              <div className="w-px bg-black/20 my-3" />
            </>
          )}
          <button
            onClick={onNext}
            disabled={loading}
            className="flex-1 px-5 py-4 flex items-center justify-between cursor-pointer hover:bg-black/5 transition-colors disabled:opacity-60"
          >
            <div className="flex items-center gap-3">
              {icon && <span className="text-xl">{icon}</span>}
              <div className="text-left">
                <div className="text-[13px] font-bold leading-tight">{label}</div>
                {sublabel && <div className="text-[12px] opacity-70">{sublabel}</div>}
              </div>
            </div>
            <span className="text-[15px] font-bold">
              {loading ? <Spinner /> : nextLabel}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
