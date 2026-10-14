/**
 * Half-open interval overlap: [start, end).
 * Two intervals conflict when existingStart < requestedEnd AND existingEnd > requestedStart.
 * Events that meet exactly at a boundary (A ends when B starts) do not conflict.
 */
export function intervalsOverlap(
  existingStart: Date,
  existingEnd: Date,
  requestedStart: Date,
  requestedEnd: Date,
): boolean {
  return existingStart < requestedEnd && existingEnd > requestedStart;
}

export function assertValidInterval(start: Date, end: Date): void {
  if (!(start instanceof Date) || !(end instanceof Date) || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error('Interval bounds must be valid dates.');
  }
  if (!(start < end)) {
    throw new Error('start must be strictly earlier than end.');
  }
}

export function availableStock(params: {
  usableQuantity: number;
  allocatedOnInterval: number;
}): number {
  return params.usableQuantity - params.allocatedOnInterval;
}
