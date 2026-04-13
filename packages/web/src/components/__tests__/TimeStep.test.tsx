import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TimeStep } from '../booking/TimeStep';
import { useBookingStore } from '../../stores/booking.store';
import type { Slot } from '../../api/use-slots';

const mockSlots: Record<string, Slot[]> = {};

vi.mock('../../api/use-slots.ts', () => ({
  useSlots: (_barberId: string | null, date: string | null) => ({
    data: date ? (mockSlots[date] ?? []) : undefined,
    isLoading: false,
  }),
}));

vi.mock('../ui/Panel', () => ({
  Panel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('../ui/StickyBar', () => ({ StickyBar: () => null }));
vi.mock('../ui/Spinner', () => ({ Spinner: () => null }));

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

// April 12, 2026 is a Sunday
const SUNDAY_APR_12 = new Date('2026-04-12T00:00:00');

describe('TimeStep', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(SUNDAY_APR_12);
    useBookingStore.getState().reset();
    Object.keys(mockSlots).forEach((k) => delete mockSlots[k]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('selects today as the initial date on mount', async () => {
    mockSlots['2026-04-12'] = [{ time: '09:00', available: true }];

    render(<TimeStep />, { wrapper });

    await waitFor(() => {
      expect(useBookingStore.getState().date).toBe('2026-04-12');
    });
  });

  it('auto-advances to the next day when today has no slots', async () => {
    mockSlots['2026-04-12'] = [];
    mockSlots['2026-04-13'] = [{ time: '09:00', available: true }];

    render(<TimeStep />, { wrapper });

    await waitFor(() => {
      expect(useBookingStore.getState().date).toBe('2026-04-13');
    });
  });

  it('keeps the week view on the week containing Monday after auto-advancing from Sunday', async () => {
    // Regression: before the fix the weekOffset was computed from Monday of the
    // current calendar week, causing the view to jump to Apr 19-25 instead of
    // staying on Apr 12-18 (the window that already contains Monday Apr 13).
    mockSlots['2026-04-12'] = [];
    mockSlots['2026-04-13'] = [{ time: '09:00', available: true }];

    render(<TimeStep />, { wrapper });

    await waitFor(() => {
      expect(useBookingStore.getState().date).toBe('2026-04-13');
    });

    expect(screen.getByText('12 Abr — 18 Abr')).toBeInTheDocument();
  });
});
