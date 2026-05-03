import { useEffect, useState } from 'react';
import { Button } from '../ui/Button.tsx';
import { Input } from '../ui/Input.tsx';
import { formatPhone, stripPhone } from '../../lib/format.ts';
import { useAdminCreatePackage, useAdminCustomerLookup } from '../../api/use-admin.ts';

interface AdminPackageModalProps {
  onClose: () => void;
}

export function AdminPackageModal({ onClose }: AdminPackageModalProps) {
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [usesDisplay, setUsesDisplay] = useState('');
  const [priceDisplay, setPriceDisplay] = useState('');
  const [lookupPhone, setLookupPhone] = useState('');

  const customerLookup = useAdminCustomerLookup(lookupPhone);
  const createPackage = useAdminCreatePackage();

  useEffect(() => {
    const stripped = stripPhone(phone);
    if (stripped.length < 10) return;

    const timer = setTimeout(() => {
      setLookupPhone(stripped);
    }, 400);

    return () => clearTimeout(timer);
  }, [phone]);

  useEffect(() => {
    if (customerLookup.data?.name) {
      setName(customerLookup.data.name);
    }
  }, [customerLookup.data]);

  const strippedPhone = stripPhone(phone);
  const uses = Number.parseInt(usesDisplay, 10);
  const parsedPrice = Number.parseFloat(priceDisplay.replace(',', '.'));
  const totalPriceCents = Math.round(parsedPrice * 100);

  const isValid =
    name.trim().length >= 2 &&
    Number.isInteger(uses) &&
    uses >= 1 &&
    !Number.isNaN(parsedPrice) &&
    totalPriceCents > 0;

  function handleSubmit() {
    if (!isValid) return;

    createPackage.mutate({
      customerName: name.trim(),
      ...(strippedPhone.length >= 10 ? { customerPhone: strippedPhone } : {}),
      totalUses: uses,
      totalPriceCents,
    }, {
      onSuccess: () => onClose(),
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-dark-surface border border-dark-border rounded-2xl w-full max-w-sm max-h-[90dvh] overflow-hidden flex flex-col">
        <div className="overflow-y-auto p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-serif text-base tracking-widest uppercase text-gold">Novo Pacote</h2>
            <button
              onClick={onClose}
              className="text-muted hover:text-[#F0EDE8] transition-colors bg-transparent border-none cursor-pointer text-lg leading-none"
            >
              ×
            </button>
          </div>

          <Input
            label="Telefone"
            inputMode="tel"
            placeholder="(11) 99999-9999"
            value={formatPhone(phone)}
            onChange={(e) => setPhone(e.target.value)}
          />

          <Input
            label="Nome"
            placeholder="Nome do cliente"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <Input
            label="Número de usos"
            inputMode="numeric"
            placeholder="Ex: 10"
            value={usesDisplay}
            onChange={(e) => setUsesDisplay(e.target.value.replace(/\D/g, ''))}
          />

          <Input
            label="Preço total (R$)"
            inputMode="decimal"
            placeholder="0,00"
            value={priceDisplay}
            onChange={(e) => setPriceDisplay(e.target.value)}
          />

          <Button
            onClick={handleSubmit}
            disabled={!isValid || createPackage.isPending}
            loading={createPackage.isPending}
            className="w-full"
          >
            Criar Pacote
          </Button>

          {createPackage.isError && (
            <p className="text-red-400 text-xs text-center mt-2">{(createPackage.error as Error)?.message}</p>
          )}
        </div>
      </div>
    </div>
  );
}
