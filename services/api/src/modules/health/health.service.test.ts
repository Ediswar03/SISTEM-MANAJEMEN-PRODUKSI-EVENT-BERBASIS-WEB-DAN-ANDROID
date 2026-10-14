import { holdsReservation } from '@epms/shared';
import { describe, expect, it } from 'vitest';

describe('reservation status helper used by later allocation services', () => {
  it('only CONFIRMED and IN_PROGRESS hold stock', () => {
    expect(holdsReservation('DRAFT')).toBe(false);
    expect(holdsReservation('CONFIRMED')).toBe(true);
    expect(holdsReservation('IN_PROGRESS')).toBe(true);
    expect(holdsReservation('COMPLETED')).toBe(false);
    expect(holdsReservation('CANCELLED')).toBe(false);
  });
});
