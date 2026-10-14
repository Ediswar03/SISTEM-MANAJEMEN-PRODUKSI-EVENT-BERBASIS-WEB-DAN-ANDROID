import { describe, expect, it } from 'vitest';
import { availableStock, intervalsOverlap } from './interval.js';

describe('intervalsOverlap (half-open [start, end))', () => {
  const at = (iso: string) => new Date(iso);

  it('detects overlapping events', () => {
    expect(
      intervalsOverlap(
        at('2026-10-20T09:00:00.000Z'),
        at('2026-10-20T12:00:00.000Z'),
        at('2026-10-20T11:00:00.000Z'),
        at('2026-10-20T14:00:00.000Z'),
      ),
    ).toBe(true);
  });

  it('does not treat back-to-back events as overlapping', () => {
    expect(
      intervalsOverlap(
        at('2026-10-20T09:00:00.000Z'),
        at('2026-10-20T12:00:00.000Z'),
        at('2026-10-20T12:00:00.000Z'),
        at('2026-10-20T14:00:00.000Z'),
      ),
    ).toBe(false);
  });

  it('detects full containment as overlap', () => {
    expect(
      intervalsOverlap(
        at('2026-10-20T09:00:00.000Z'),
        at('2026-10-20T18:00:00.000Z'),
        at('2026-10-20T10:00:00.000Z'),
        at('2026-10-20T11:00:00.000Z'),
      ),
    ).toBe(true);
  });
});

describe('availableStock', () => {
  it('subtracts overlapping allocations from usable quantity', () => {
    expect(availableStock({ usableQuantity: 8, allocatedOnInterval: 5 })).toBe(3);
  });

  it('can reach zero but does not clamp negatives (caller must reject)', () => {
    expect(availableStock({ usableQuantity: 2, allocatedOnInterval: 4 })).toBe(-2);
  });
});
