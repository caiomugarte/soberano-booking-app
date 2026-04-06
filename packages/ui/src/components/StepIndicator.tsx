const LABELS = ['Serviço', 'Barbeiro', 'Horário', 'Seus dados', 'Confirmar'];

export function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex justify-center">
      <div className="grid gap-0 w-full max-w-[480px]" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
        {LABELS.map((label, i) => {
          const step = i + 1;
          const isActive = step === current;
          const isCompleted = step < current;
          return (
            <div key={step} className="flex flex-col items-center gap-1.5 relative">
              {/* Connector line */}
              {step < 5 && (
                <span
                  className={`absolute top-3.5 h-px transition-colors duration-300 ${isCompleted ? 'bg-gold' : 'bg-dark-border'}`}
                  style={{ left: 'calc(50% + 14px)', width: 'calc(100% - 28px)' }}
                />
              )}
              {/* Circle */}
              <span
                className={`w-7 h-7 rounded-full border flex items-center justify-center text-[11px] font-medium transition-all duration-300 z-10
                  ${isCompleted ? 'bg-gold border-gold text-dark' : ''}
                  ${isActive ? 'border-gold text-gold shadow-[0_0_16px_rgba(201,169,110,0.25)] bg-dark' : ''}
                  ${!isActive && !isCompleted ? 'border-dark-border text-muted bg-dark' : ''}
                `}
              >
                {isCompleted ? '✓' : step}
              </span>
              {/* Label */}
              <span className={`text-[8px] tracking-[0.08em] uppercase whitespace-nowrap ${isActive ? 'text-gold' : 'text-muted'}`}>
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
