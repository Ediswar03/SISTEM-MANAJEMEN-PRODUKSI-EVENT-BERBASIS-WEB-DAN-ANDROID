import { prisma } from '../../lib/prisma.js';
import { HttpError } from '../../lib/http-error.js';
import { canTransitionEvent } from '@epms/shared';
import type {
  CreateEventInput,
  UpdateEventInput,
  TransitionStatusInput,
  EventQueryInput,
} from './events.schemas.js';

// ─── CREATE ─────────────────────────────────────────────────────────────────

export async function createEvent(input: CreateEventInput, actorId: string) {
  const existing = await prisma.event.findUnique({ where: { code: input.code } });
  if (existing) {
    throw new HttpError(409, 'DUPLICATE_CODE', `Event code '${input.code}' is already in use.`);
  }

  if (input.responsibleUserId) {
    const user = await prisma.user.findUnique({ where: { id: input.responsibleUserId } });
    if (!user || !user.isActive) {
      throw new HttpError(404, 'NOT_FOUND', 'Responsible user not found or is inactive.');
    }
  }

  return prisma.$transaction(async (tx) => {
    const event = await tx.event.create({
      data: {
        code: input.code,
        name: input.name,
        clientName: input.clientName ?? null,
        location: input.location,
        timezone: input.timezone,
        startAt: new Date(input.startAt),
        endAt: new Date(input.endAt),
        notes: input.notes ?? null,
        createdById: actorId,
        responsibleUserId: input.responsibleUserId ?? null,
        status: 'DRAFT',
      },
    });

    await tx.eventStatusHistory.create({
      data: {
        eventId: event.id,
        fromStatus: null,
        toStatus: 'DRAFT',
        changedById: actorId,
        reason: 'Event created',
      },
    });

    await tx.auditLog.create({
      data: {
        actorId,
        action: 'EVENT_CREATE',
        entityType: 'event',
        entityId: event.id,
        result: 'SUCCESS',
      },
    });

    return event;
  });
}

// ─── LIST ────────────────────────────────────────────────────────────────────

export async function getEvents(query: EventQueryInput) {
  const { status, page, limit, search } = query;
  const skip = (page - 1) * limit;

  const where = {
    ...(status !== undefined ? { status } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search } },
            { code: { contains: search } },
            { clientName: { contains: search } },
            { location: { contains: search } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.event.findMany({
      where,
      skip,
      take: limit,
      orderBy: { startAt: 'desc' },
      include: {
        createdBy: { select: { id: true, fullName: true, email: true } },
        responsibleUser: { select: { id: true, fullName: true, email: true } },
        _count: { select: { allocations: true, assignments: true } },
      },
    }),
    prisma.event.count({ where }),
  ]);

  return {
    data: items,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

// ─── GET BY ID ───────────────────────────────────────────────────────────────

export async function getEventById(id: string) {
  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      createdBy: { select: { id: true, fullName: true, email: true } },
      responsibleUser: { select: { id: true, fullName: true, email: true } },
      allocations: {
        orderBy: { createdAt: 'asc' },
        include: {
          equipment: { select: { id: true, code: true, name: true, usableQuantity: true } },
        },
      },
      assignments: {
        orderBy: { createdAt: 'asc' },
        include: {
          crewProfile: {
            include: { user: { select: { id: true, fullName: true, email: true } } },
          },
        },
      },
      statusHistory: {
        orderBy: { createdAt: 'asc' },
        include: { changedBy: { select: { id: true, fullName: true } } },
      },
    },
  });

  if (!event) {
    throw new HttpError(404, 'NOT_FOUND', 'Event not found.');
  }

  return event;
}

// ─── UPDATE ──────────────────────────────────────────────────────────────────

export async function updateEvent(id: string, input: UpdateEventInput, actorId: string) {
  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) throw new HttpError(404, 'NOT_FOUND', 'Event not found.');

  if (!['DRAFT', 'CONFIRMED'].includes(event.status)) {
    throw new HttpError(422, 'INVALID_STATE', `Cannot edit an event in '${event.status}' status.`);
  }

  if (input.responsibleUserId !== undefined && input.responsibleUserId !== null) {
    const user = await prisma.user.findUnique({ where: { id: input.responsibleUserId } });
    if (!user || !user.isActive) {
      throw new HttpError(404, 'NOT_FOUND', 'Responsible user not found or is inactive.');
    }
  }

  // Build update payload strictly (no undefined spreading into optional fields)
  const data: Parameters<typeof prisma.event.update>[0]['data'] = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.clientName !== undefined) data.clientName = input.clientName;
  if (input.location !== undefined) data.location = input.location;
  if (input.timezone !== undefined) data.timezone = input.timezone;
  if (input.startAt !== undefined) data.startAt = new Date(input.startAt);
  if (input.endAt !== undefined) data.endAt = new Date(input.endAt);
  if (input.notes !== undefined) data.notes = input.notes;
  if (input.responsibleUserId !== undefined) data.responsibleUserId = input.responsibleUserId;

  return prisma.$transaction(async (tx) => {
    const updated = await tx.event.update({ where: { id }, data });

    await tx.auditLog.create({
      data: {
        actorId,
        action: 'EVENT_UPDATE',
        entityType: 'event',
        entityId: id,
        result: 'SUCCESS',
      },
    });

    return updated;
  });
}

// ─── STATUS TRANSITION ───────────────────────────────────────────────────────

export async function transitionEventStatus(
  id: string,
  input: TransitionStatusInput,
  actorId: string,
) {
  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) throw new HttpError(404, 'NOT_FOUND', 'Event not found.');

  const from = event.status as import('@epms/shared').EventStatus;
  const to = input.toStatus as import('@epms/shared').EventStatus;

  if (!canTransitionEvent(from, to)) {
    throw new HttpError(
      422,
      'INVALID_TRANSITION',
      `Cannot transition from '${from}' to '${to}'.`,
    );
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.event.update({
      where: { id },
      data: {
        status: to,
        ...(to === 'CANCELLED' ? { cancelledAt: new Date() } : {}),
      },
    });

    await tx.eventStatusHistory.create({
      data: {
        eventId: id,
        fromStatus: from,
        toStatus: to,
        changedById: actorId,
        reason: input.reason ?? null,
      },
    });

    // DRAFT → CONFIRMED: activate pending allocations
    if (from === 'DRAFT' && to === 'CONFIRMED') {
      await tx.equipmentAllocation.updateMany({
        where: { eventId: id, status: 'PENDING' },
        data: { status: 'ACTIVE' },
      });
    }

    // Cancellation: cancel all active allocations + assignments
    if (to === 'CANCELLED') {
      await tx.equipmentAllocation.updateMany({
        where: { eventId: id, status: { not: 'CANCELLED' } },
        data: { status: 'CANCELLED', cancelledAt: new Date() },
      });
      await tx.crewAssignment.updateMany({
        where: { eventId: id, status: { not: 'CANCELLED' } },
        data: { status: 'CANCELLED', cancelledAt: new Date() },
      });
    }

    await tx.auditLog.create({
      data: {
        actorId,
        action: 'EVENT_STATUS_TRANSITION',
        entityType: 'event',
        entityId: id,
        result: 'SUCCESS',
        reason: `${from} → ${to}${input.reason ? `: ${input.reason}` : ''}`,
      },
    });

    return updated;
  });
}

// ─── DELETE (soft-cancel) ────────────────────────────────────────────────────

export async function cancelEvent(id: string, reason: string | undefined, actorId: string) {
  return transitionEventStatus(id, { toStatus: 'CANCELLED', reason }, actorId);
}
