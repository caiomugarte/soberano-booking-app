const steps = [
  'Serviço', 'Barbeiro', 'Horário', 'Seus Dados', 'Confirmar'
];

export default function Stepper({ currentStep }) {
  return (
    <div className="stepper">
      {steps.map((label, index) => {
        const stepNum = index + 1;
        const isActive = currentStep === stepNum;
        const isCompleted = currentStep > stepNum;
        
        return (
          <div 
            key={label}
            className={`step-item ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
          >
            <div className="step-circle">
              {isCompleted ? '✓' : stepNum}
            </div>
            <span className="step-label" style={{ color: isActive ? 'var(--accent-color)' : isCompleted ? 'var(--text-main)' : 'var(--text-muted)' }}>
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
