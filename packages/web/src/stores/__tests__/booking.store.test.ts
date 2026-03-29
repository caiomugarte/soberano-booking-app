import { describe, it, expect, beforeEach } from 'vitest';
import { useBookingStore } from '../booking.store.ts';
import type { Service, Barber } from '@soberano/shared';

const mockService: Service = {
  id: 'service-1',
  slug: 'corte',
  name: 'Corte',
  icon: '✂️',
  priceCents: 3500,
  duration: 30,
  isActive: true,
  sortOrder: 1,
};

const mockBarber: Barber = {
  id: 'barber-1',
  slug: 'joao',
  firstName: 'João',
  lastName: 'Silva',
  avatarUrl: null,
  isActive: true,
};

beforeEach(() => {
  useBookingStore.getState().reset();
});

describe('booking store — initial state', () => {
  it('starts at step 1', () => {
    expect(useBookingStore.getState().step).toBe(1);
  });

  it('has no service, barber, date, or slot selected', () => {
    const s = useBookingStore.getState();
    expect(s.service).toBeNull();
    expect(s.barber).toBeNull();
    expect(s.date).toBeNull();
    expect(s.slot).toBeNull();
  });

  it('has empty customer fields', () => {
    const s = useBookingStore.getState();
    expect(s.customerName).toBe('');
    expect(s.customerPhone).toBe('');
  });
});

describe('booking store — setters', () => {
  it('setService updates service', () => {
    useBookingStore.getState().setService(mockService);
    expect(useBookingStore.getState().service).toEqual(mockService);
  });

  it('setBarber updates barber', () => {
    useBookingStore.getState().setBarber(mockBarber);
    expect(useBookingStore.getState().barber).toEqual(mockBarber);
  });

  it('setDate updates date and clears slot', () => {
    useBookingStore.getState().setSlot('10:00');
    useBookingStore.getState().setDate('2026-06-15');
    const s = useBookingStore.getState();
    expect(s.date).toBe('2026-06-15');
    expect(s.slot).toBeNull();
  });

  it('setSlot updates slot', () => {
    useBookingStore.getState().setSlot('14:30');
    expect(useBookingStore.getState().slot).toBe('14:30');
  });

  it('setCustomer updates name and phone', () => {
    useBookingStore.getState().setCustomer('Maria', '11999998888');
    const s = useBookingStore.getState();
    expect(s.customerName).toBe('Maria');
    expect(s.customerPhone).toBe('11999998888');
  });
});

describe('booking store — step navigation', () => {
  it('nextStep increments step', () => {
    useBookingStore.getState().nextStep();
    expect(useBookingStore.getState().step).toBe(2);
  });

  it('prevStep decrements step', () => {
    useBookingStore.getState().goToStep(3);
    useBookingStore.getState().prevStep();
    expect(useBookingStore.getState().step).toBe(2);
  });

  it('nextStep does not exceed step 5', () => {
    useBookingStore.getState().goToStep(5);
    useBookingStore.getState().nextStep();
    expect(useBookingStore.getState().step).toBe(5);
  });

  it('prevStep does not go below step 1', () => {
    useBookingStore.getState().prevStep();
    expect(useBookingStore.getState().step).toBe(1);
  });

  it('goToStep jumps directly to a step', () => {
    useBookingStore.getState().goToStep(4);
    expect(useBookingStore.getState().step).toBe(4);
  });
});

describe('booking store — reset', () => {
  it('reset clears all selections', () => {
    useBookingStore.getState().setService(mockService);
    useBookingStore.getState().setBarber(mockBarber);
    useBookingStore.getState().setDate('2026-06-15');
    useBookingStore.getState().setSlot('10:00');
    useBookingStore.getState().setCustomer('Maria', '11999998888');
    useBookingStore.getState().goToStep(5);

    useBookingStore.getState().reset();

    const s = useBookingStore.getState();
    expect(s.step).toBe(1);
    expect(s.service).toBeNull();
    expect(s.barber).toBeNull();
    expect(s.date).toBeNull();
    expect(s.slot).toBeNull();
    expect(s.customerName).toBe('');
    expect(s.customerPhone).toBe('');
  });
});
