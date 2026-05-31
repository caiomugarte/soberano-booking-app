export interface CustomerEntity {
  id: string;
  name: string;
  phone: string | null;
  cpf: string | null;
  email: string | null;
  notes: string | null;
  careMode: 'psychotherapy' | 'neuromodulation';
  psychotherapyPriceCents: number | null;
  psychotherapyFrequency: 'weekly' | 'biweekly' | null;
  birthDate: Date | null;
  address: string | null;
}
