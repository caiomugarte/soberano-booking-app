export default function BottomBar({ currentStep, canProceed, onNext, onBack, onConfirm, isConfirming, selections }) {
  if (currentStep === 5) {
    return (
      <div className="bottom-bar visible glass-panel" style={{ borderBottom: 'none', borderLeft: 'none', borderRight: 'none' }}>
        <div className="bottom-bar-content">
          <div style={{ display: 'flex', gap: '16px' }}>
            <button className="btn-secondary" style={{ flex: 1 }} onClick={onBack} disabled={isConfirming}>
              Voltar
            </button>
            <button className="btn-primary btn-success" style={{ flex: 2, opacity: isConfirming ? 0.7 : 1 }} onClick={onConfirm} disabled={isConfirming}>
              {isConfirming ? 'Confirmando...' : '✓ Confirmar Agendamento'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bottom-bar glass-panel ${(canProceed || currentStep > 1) ? 'visible' : ''}`} style={{ borderBottom: 'none', borderLeft: 'none', borderRight: 'none' }}>
      <div className="bottom-bar-content">
        {currentStep === 1 && selections.service && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Total</p>
              <p style={{ fontSize: '18px', fontWeight: 600 }}>R$ {(selections.service.priceCents / 100).toFixed(2).replace('.', ',')}</p>
            </div>
          </div>
        )}
        <div style={{ display: 'flex', gap: '16px' }}>
          {currentStep > 1 && (
            <button className="btn-secondary" style={{ flex: 1 }} onClick={onBack}>
              Voltar
            </button>
          )}
          <button 
            className="btn-primary" 
            style={{ flex: currentStep > 1 ? 2 : 1, opacity: canProceed ? 1 : 0.5, pointerEvents: canProceed ? 'auto' : 'none' }} 
            onClick={onNext}
          >
            Continuar →
          </button>
        </div>
      </div>
    </div>
  );
}
