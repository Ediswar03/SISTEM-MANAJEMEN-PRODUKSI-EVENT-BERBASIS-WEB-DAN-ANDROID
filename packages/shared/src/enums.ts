export const USER_ROLES = ['ADMIN', 'CREW'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const EVENT_STATUSES = [
  'DRAFT',
  'CONFIRMED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];

/** Event statuses that hold equipment and crew reservations. */
export const RESERVATION_EVENT_STATUSES = ['CONFIRMED', 'IN_PROGRESS'] as const;
export type ReservationEventStatus = (typeof RESERVATION_EVENT_STATUSES)[number];

export const EVENT_STATUS_TRANSITIONS: Record<EventStatus, readonly EventStatus[]> = {
  DRAFT: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
};

export const EQUIPMENT_CONDITIONS = ['EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'UNUSABLE'] as const;
export type EquipmentCondition = (typeof EQUIPMENT_CONDITIONS)[number];

export const ALLOCATION_STATUSES = ['PENDING', 'ACTIVE', 'CANCELLED'] as const;
export type AllocationStatus = (typeof ALLOCATION_STATUSES)[number];

export const ASSIGNMENT_STATUSES = ['ACTIVE', 'CANCELLED'] as const;
export type AssignmentStatus = (typeof ASSIGNMENT_STATUSES)[number];

export const CREW_JOB_STATUSES = [
  'ASSIGNED',
  'CHECKED_IN',
  'IN_PROGRESS',
  'COMPLETED',
  'BLOCKED',
] as const;
export type CrewJobStatus = (typeof CREW_JOB_STATUSES)[number];

export function holdsReservation(status: EventStatus): boolean {
  return (RESERVATION_EVENT_STATUSES as readonly string[]).includes(status);
}

export function canTransitionEvent(from: EventStatus, to: EventStatus): boolean {
  return EVENT_STATUS_TRANSITIONS[from].includes(to);
}
