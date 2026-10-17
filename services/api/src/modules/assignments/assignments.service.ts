import { prisma } from '../../lib/prisma.js';
import { HttpError } from '../../lib/http-error.js';
import type { CreateAssignmentInput, UpdateAssignmentInput } from './assignments.schemas.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Crew profile row shape returned by raw FOR UPDATE query */
type CrewProfileRow = { id: string; is_active: number };

/**
 * Check for overlapping ACTIVE assignments for a crew member.
 * Must be called INSIDE a transaction that has already locked the crew_profile row.
 */
async function findCrewConflict(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  crewProfileId: string,
  startAt: Date,
  endAt: Date,
  excludeEventId?: string,
) {
  return tx.crewAssignment.findFirst({
    where: {
      crewProfileId,
      status: 'ACTIVE',
      startAt: { lt: endAt },
      endAt: { gt: startAt },
      ...(excludeEventId ? { eventId: { not: excludeEventId } } : {}),
    },
    include: {
      event: { select: { id: true, code: true, name: true, startAt: true, endAt: true } },
    },
  });
}

// ─── LIST ─────────────────────────────────────────────────────────────────────

export async function getEventAssignments(eventId: string) {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) throw new HttpError(404, 'NOT_FOUND', 'Event not found.');

  return prisma.crewAssignment.findMany({
    where: { eventId },
    orderBy: { createdAt: 'asc' },
    include: {
      crewProfile: {
        include: {
          user: { select: { id: true, fullName: true, email: true } },
        },
      },
    },
  });
}

// ─── CREATE (with SELECT FOR UPDATE) ─────────────────────────────────────────

export async function createAssignment(
  eventId: string,
  input: CreateAssignmentInput,
  actorId: string,
) {
  // Pre-checks outside transaction (read-only, no locking needed)
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) throw new HttpError(404, 'NOT_FOUND', 'Event not found.');
  if (['COMPLETED', 'CANCELLED'].includes(event.status)) {
    throw new HttpError(422, 'INVALID_STATE', `Cannot add crew to a ${event.status} event.`);
  }

  const startAt = new Date(input.startAt);
  const endAt = new Date(input.endAt);

  return prisma.$transaction(async (tx) => {
    // ⚠️ CRITICAL: Lock crew_profile row FIRST to prevent concurrent double-assignment.
    // Any concurrent transaction trying to assign the same crew will block here until
    // this transaction commits or rolls back.
    const rows = await tx.$queryRaw<CrewProfileRow[]>`
      SELECT cp.id, cp.is_active
      FROM crew_profiles cp
      INNER JOIN users u ON u.id = cp.user_id
      WHERE cp.id = ${input.crewProfileId}
        AND cp.is_active = 1
        AND u.is_active = 1
      FOR UPDATE
    `;

    if (rows.length === 0) {
      throw new HttpError(404, 'NOT_FOUND', 'Crew member not found or is inactive.');
    }

    // Re-check schedule conflict INSIDE the transaction with the lock held.
    // This prevents the TOCTOU (Time-of-Check-Time-of-Use) race condition.
    const conflict = await findCrewConflict(tx, input.crewProfileId, startAt, endAt, eventId);

    if (conflict) {
      const conflictStart = conflict.startAt.toISOString();
      const conflictEnd = conflict.endAt.toISOString();
      throw new HttpError(
        409,
        'SCHEDULE_CONFLICT',
        `Jadwal kru bertabrakan dengan penugasan lain. Kru sudah ditugaskan ke event '${conflict.event.code} – ${conflict.event.name}' pada rentang ${conflictStart} s/d ${conflictEnd}.`,
        {
          conflictingEvent: {
            id: conflict.event.id,
            code: conflict.event.code,
            name: conflict.event.name,
          },
          conflictingInterval: { startAt: conflictStart, endAt: conflictEnd },
          requestedInterval: { startAt: startAt.toISOString(), endAt: endAt.toISOString() },
        },
      );
    }

    // Unique constraint (eventId, crewProfileId) will catch same-event duplicates at DB level
    const assignment = await tx.crewAssignment.create({
      data: {
        eventId,
        crewProfileId: input.crewProfileId,
        roleInEvent: input.roleInEvent,
        startAt,
        endAt,
        notes: input.notes ?? null,
        status: 'ACTIVE',
        jobStatus: 'ASSIGNED',
      },
      include: {
        crewProfile: {
          include: { user: { select: { id: true, fullName: true, email: true } } },
        },
      },
    });

    await tx.auditLog.create({
      data: {
        actorId,
        action: 'ASSIGNMENT_CREATE',
        entityType: 'crew_assignment',
        entityId: assignment.id,
        result: 'SUCCESS',
        reason: `role=${input.roleInEvent}`,
      },
    });

    return assignment;
  });
}

// ─── UPDATE JOB STATUS / ROLE ─────────────────────────────────────────────────

export async function updateAssignment(
  eventId: string,
  assignmentId: string,
  input: UpdateAssignmentInput,
  actorId: string,
) {
  const existing = await prisma.crewAssignment.findUnique({ where: { id: assignmentId } });
  if (!existing || existing.eventId !== eventId) {
    throw new HttpError(404, 'NOT_FOUND', 'Assignment not found on this event.');
  }
  if (existing.status === 'CANCELLED') {
    throw new HttpError(422, 'INVALID_STATE', 'Cannot modify a cancelled assignment.');
  }

  const data: Parameters<typeof prisma.crewAssignment.update>[0]['data'] = {};
  if (input.roleInEvent !== undefined) data.roleInEvent = input.roleInEvent;
  if (input.jobStatus !== undefined) data.jobStatus = input.jobStatus;
  if (input.notes !== undefined) data.notes = input.notes;

  return prisma.$transaction(async (tx) => {
    const updated = await tx.crewAssignment.update({
      where: { id: assignmentId },
      data,
      include: {
        crewProfile: {
          include: { user: { select: { id: true, fullName: true, email: true } } },
        },
      },
    });

    await tx.auditLog.create({
      data: {
        actorId,
        action: 'ASSIGNMENT_UPDATE',
        entityType: 'crew_assignment',
        entityId: assignmentId,
        result: 'SUCCESS',
      },
    });

    return updated;
  });
}

// ─── CANCEL ───────────────────────────────────────────────────────────────────

export async function cancelAssignment(eventId: string, assignmentId: string, actorId: string) {
  const existing = await prisma.crewAssignment.findUnique({ where: { id: assignmentId } });
  if (!existing || existing.eventId !== eventId) {
    throw new HttpError(404, 'NOT_FOUND', 'Assignment not found on this event.');
  }
  if (existing.status === 'CANCELLED') {
    throw new HttpError(422, 'INVALID_STATE', 'Assignment is already cancelled.');
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.crewAssignment.update({
      where: { id: assignmentId },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
      include: {
        crewProfile: {
          include: { user: { select: { id: true, fullName: true, email: true } } },
        },
      },
    });

    await tx.auditLog.create({
      data: {
        actorId,
        action: 'ASSIGNMENT_CANCEL',
        entityType: 'crew_assignment',
        entityId: assignmentId,
        result: 'SUCCESS',
      },
    });

    return updated;
  });
}
