import { describe, expect, it } from 'vitest';
import {
  isPatientMinorOnBusinessDate,
  resolveParentsMeetingStatus,
} from '../patient-profile.utils.js';

describe('patient-profile utils', () => {
  it('classifies minors using the Sao Paulo business date boundary', () => {
    expect(
      isPatientMinorOnBusinessDate(
        new Date('2008-06-03T00:00:00Z'),
        '2026-06-02',
      ),
    ).toBe(true);

    expect(
      isPatientMinorOnBusinessDate(
        new Date('2008-06-02T00:00:00Z'),
        '2026-06-02',
      ),
    ).toBe(false);
  });

  it('surfaces a pending parents meeting when the patient is still underage and nothing was saved yet', () => {
    expect(
      resolveParentsMeetingStatus({
        birthDate: new Date('2012-06-15T00:00:00Z'),
        parentsMeetingStatus: null,
        businessDate: '2026-06-02',
      }),
    ).toBe('pending');
  });
});
