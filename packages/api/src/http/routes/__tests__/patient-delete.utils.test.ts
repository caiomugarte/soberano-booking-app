import { describe, expect, it } from 'vitest';
import { resolvePatientDeleteRecurringSeriesDependencies } from '../patient-delete.utils.js';

describe('resolvePatientDeleteRecurringSeriesDependencies', () => {
  it('treats series with appointments as blockers', () => {
    const result = resolvePatientDeleteRecurringSeriesDependencies([
      { id: 'series-1', appointmentCount: 2 },
      { id: 'series-2', appointmentCount: 1 },
    ]);

    expect(result).toEqual({
      blockingCount: 2,
      orphanIds: [],
    });
  });

  it('collects orphan series ids when no appointments remain', () => {
    const result = resolvePatientDeleteRecurringSeriesDependencies([
      { id: 'series-1', appointmentCount: 0 },
      { id: 'series-2', appointmentCount: 0 },
    ]);

    expect(result).toEqual({
      blockingCount: 0,
      orphanIds: ['series-1', 'series-2'],
    });
  });

  it('splits blockers from orphan rows', () => {
    const result = resolvePatientDeleteRecurringSeriesDependencies([
      { id: 'series-1', appointmentCount: 0 },
      { id: 'series-2', appointmentCount: 3 },
      { id: 'series-3', appointmentCount: 0 },
    ]);

    expect(result).toEqual({
      blockingCount: 1,
      orphanIds: ['series-1', 'series-3'],
    });
  });
});
