import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import Stepper from './components/Stepper';
import StepService from './components/StepService';
import StepBarber from './components/StepBarber';
import StepTime from './components/StepTime';
import StepUserData from './components/StepUserData';
import StepConfirm from './components/StepConfirm';
import BottomBar from './components/BottomBar';
import { api } from './config/api.js';

function App() {
  const [currentStep, setCurrentStep] = useState(1);
  const [selections, setSelections] = useState({
    service: null,
    barber: null,
    date: null,
    time: null,
    userName: '',
    userPhone: ''
  });
  const [bookingError, setBookingError] = useState(null);

  const updateSelection = (key, value) => {
    setSelections(prev => ({ ...prev, [key]: value }));
  };

  const handleNext = () => {
    if (currentStep < 5) setCurrentStep(prev => prev + 1);
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(prev => prev - 1);
  };

  const bookingMutation = useMutation({
    mutationFn: () => api.post('/book', {
      serviceId: selections.service.id,
      barberId: selections.barber.id,
      date: selections.date.iso,
      startTime: selections.time,
      customerName: selections.userName,
      customerPhone: selections.userPhone.replace(/\D/g, ''),
    }),
    onSuccess: () => setCurrentStep(6),
    onError: (err) => setBookingError(err.message),
  });

  const handleConfirm = () => {
    setBookingError(null);
    bookingMutation.mutate();
  };

  // Determine if the current step has a valid selection to allow proceeding
  const canProceed = () => {
    switch (currentStep) {
      case 1: return !!selections.service;
      case 2: return !!selections.barber;
      case 3: return !!selections.date?.iso && !!selections.time;
      case 4: return selections.userName.trim().length > 2 && selections.userPhone.trim().length >= 10;
      default: return false;
    }
  };

  return (
    <div className="app-container">
      <header className="header">
        <img src="/logo.jpg" alt="Barbearia da Marquês" className="header-logo" />
        <h1>Barbearia da Marquês</h1>
        <p>Agende seu horário com nossos especialistas</p>
      </header>

      <Stepper currentStep={currentStep} />

      <main>
        {currentStep === 1 && (
          <StepService 
            selected={selections.service} 
            onSelect={(e) => updateSelection('service', e)} 
          />
        )}
        {currentStep === 2 && (
          <StepBarber 
            selected={selections.barber} 
            onSelect={(e) => updateSelection('barber', e)} 
          />
        )}
        {currentStep === 3 && (
          <StepTime
            barber={selections.barber}
            selectedDate={selections.date}
            selectedTime={selections.time}
            onSelectDate={(e) => updateSelection('date', e)}
            onSelectTime={(e) => updateSelection('time', e)}
          />
        )}
        {currentStep === 4 && (
          <StepUserData 
            name={selections.userName}
            phone={selections.userPhone}
            onChangeName={(e) => updateSelection('userName', e)}
            onChangePhone={(e) => updateSelection('userPhone', e)}
          />
        )}
        {currentStep === 5 && (
          <StepConfirm
            selections={selections}
            bookingError={bookingError}
          />
        )}
        {currentStep === 6 && (
          <div className="step-container" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>✓</div>
            <h2 className="step-title">Agendamento Confirmado!</h2>
            <div style={{ borderRadius: 'var(--radius-md)', padding: '24px', backgroundColor: 'var(--surface-color)', border: '1px solid var(--border-color)', textAlign: 'left', marginTop: '24px' }}>
              <p style={{ marginBottom: '8px' }}><strong>Barbeiro:</strong> {selections.barber?.firstName} {selections.barber?.lastName}</p>
              <p style={{ marginBottom: '8px' }}><strong>Serviço:</strong> {selections.service?.name}</p>
              <p style={{ marginBottom: '8px' }}><strong>Data:</strong> {selections.date?.label}</p>
              <p><strong>Horário:</strong> {selections.time}</p>
            </div>
          </div>
        )}
      </main>

      {currentStep !== 6 && (
        <BottomBar
          currentStep={currentStep}
          canProceed={canProceed()}
          onNext={handleNext}
          onBack={handleBack}
          onConfirm={handleConfirm}
          isConfirming={bookingMutation.isPending}
          selections={selections}
        />
      )}
      {currentStep === 6 && (
        <div className="bottom-bar visible glass-panel" style={{ borderBottom: 'none', borderLeft: 'none', borderRight: 'none' }}>
          <div className="bottom-bar-content">
            <button className="btn-primary" onClick={() => {
              setCurrentStep(1);
              setSelections({ service: null, barber: null, date: null, time: null, userName: '', userPhone: '' });
              setBookingError(null);
            }}>
              Novo agendamento
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
