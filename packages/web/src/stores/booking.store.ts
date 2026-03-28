import { create } from 'zustand';
import type { Service, Barber } from '@soberano/shared';

interface BookingState {
  step: 1 | 2 | 3 | 4 | 5;
  service: Service | null;
  barber: Barber | null;
  date: string | null;   // YYYY-MM-DD
  slot: string | null;   // HH:mm
  customerName: string;
  customerPhone: string;

  setService: (service: Service) => void;
  setBarber: (barber: Barber) => void;
  setDate: (date: string) => void;
  setSlot: (slot: string) => void;
  setCustomer: (name: string, phone: string) => void;
  goToStep: (step: BookingState['step']) => void;
  nextStep: () => void;
  prevStep: () => void;
  reset: () => void;
}

const initialState = {
  step: 1 as const,
  service: null,
  barber: null,
  date: null,
  slot: null,
  customerName: '',
  customerPhone: '',
};

export const useBookingStore = create<BookingState>((set) => ({
  ...initialState,

  setService: (service) => set({ service }),
  setBarber: (barber) => set({ barber }),
  setDate: (date) => set({ date, slot: null }),
  setSlot: (slot) => set({ slot }),
  setCustomer: (customerName, customerPhone) => set({ customerName, customerPhone }),
  goToStep: (step) => set({ step }),
  nextStep: () => set((s) => ({ step: Math.min(5, s.step + 1) as BookingState['step'] })),
  prevStep: () => set((s) => ({ step: Math.max(1, s.step - 1) as BookingState['step'] })),
  reset: () => set(initialState),
}));
