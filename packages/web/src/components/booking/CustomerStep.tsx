import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useBookingStore } from '../../stores/booking.store.ts';
import { Panel } from '../ui/Panel.tsx';
import { StickyBar } from '../ui/StickyBar.tsx';
import { Input } from '../ui/Input.tsx';
import { formatPhone, stripPhone } from '../../lib/format.ts';

export function CustomerStep() {
  const { customerName, customerPhone, setCustomer, nextStep, prevStep } = useBookingStore();
  const [name, setName] = useState(customerName);
  const [phone, setPhone] = useState(customerPhone ? formatPhone(customerPhone) : '');

  const rawPhone = stripPhone(phone);
  const canContinue = name.trim().length >= 2 && rawPhone.length >= 10;

  function handleContinue() {
    setCustomer(name.trim(), rawPhone);
    nextStep();
  }

  return (
    <>
      <Panel title="Seus dados" subtitle="Só precisamos do seu nome e WhatsApp para confirmar">
        <Input
          label="Nome completo"
          placeholder="Ex: João Silva"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="given-name"
        />
        <Input
          label="WhatsApp (número cadastrado no app)"
          placeholder="(11) 99999-9999"
          prefix="🇧🇷 +55"
          value={phone}
          onChange={(e) => setPhone(formatPhone(e.target.value))}
          inputMode="tel"
          autoComplete="tel"
        />
        <p className="text-[11px] text-muted mt-1">
          Seus dados são usados apenas para confirmar seu agendamento.{' '}
          <Link to="/privacidade" className="underline hover:text-gold transition-colors">Política de privacidade</Link>
        </p>
      </Panel>

      <StickyBar
        visible={canContinue}
        onNext={handleContinue}
        onBack={prevStep}
        icon="👤"
        label={name.trim() || 'Seus dados'}
        sublabel={phone || undefined}
      />
    </>
  );
}
