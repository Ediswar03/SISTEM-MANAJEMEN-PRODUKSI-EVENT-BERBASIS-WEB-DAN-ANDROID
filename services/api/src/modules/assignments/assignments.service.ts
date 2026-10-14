import { prisma } from '../../lib/prisma.js';
import { HttpError } from '../../lib/http-error.js';
import type { CreateAssignmentInput, UpdateAssignmentInput } from './assignments.schemas.js';

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

// ─── CREATE ───────────────────────────────────────────────────────────────────

export async function createAssignment(
  eventId: string,
  input: CreateAssignmentInput,
  actorId: string,
) {
  // Validate event
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) throw new HttpError(404, 'NOT_FOUND', 'Event not found.');
  if (['COMPLETED', 'CANCELLED'].includes(event.status)) {
    throw new HttpError(422, 'INVALID_STATE', `Cannot add crew to a ${event.status} event.`);
  }

  // Validate crew profile
  const crew = await prisma.crewProfile.findUnique({
    where: { id: input.crewProfileId },
    include: { user: { select: { id: true, fullName: true, isActive: true } } },
  });
  if (!crew || !crew.isActive || !crew.user.isActive) {
    throw new HttpError(404, 'NOT_FOUND', 'Crew member not found or is inactive.');
  }

  const startAt = new Date(input.startAt);
  const endAt = new Date(input.endAt);

  // Check schedule conflict: crew cannot have overlapping ACTIVE assignments
  const conflict = await prisma.crewAssignment.findFirst({
    where: {
      crewProfileId: input.crewProfileId,
      status: 'ACTIVE',
      startAt: { lt: endAt },
      endAt: { gt: startAt },
      eventId: { not: eventId }, // allow updating same event assignment
    },
    include: {
      event: { select: { id: true, code: true, name: true } },
    },
  });

  if (conflict) {
    throw new HttpError(
      409,
      'SCHEDULE_CONFLICT',
      `Crew member is already assigned to event '${conflict.event.code}' during the requested interval.`,
    );
  }

  // Unique constraint (eventId, crewProfileId) will catch same-event duplicates at DB level
  return prisma.$transaction(async (tx) => {
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
