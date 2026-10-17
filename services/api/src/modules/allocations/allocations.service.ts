import { prisma } from '../../lib/prisma.js';
import { HttpError } from '../../lib/http-error.js';
import { availableStock } from '@epms/shared';
import type { CreateAllocationInput, UpdateAllocationInput } from './allocations.schemas.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Equipment row shape returned by raw FOR UPDATE query */
type EquipmentRow = { id: string; usable_quantity: number; is_active: number };

/**
 * Compute total quantity already ACTIVE in a time interval for a given equipment.
 * Must be called INSIDE a transaction that has already locked the equipment row.
 */
async function sumActiveAllocations(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  equipmentId: string,
  startAt: Date,
  endAt: Date,
  excludeId?: string,
): Promise<number> {
  const agg = await tx.equipmentAllocation.aggregate({
    where: {
      equipmentId,
      status: 'ACTIVE',
      startAt: { lt: endAt },
      endAt: { gt: startAt },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    _sum: { quantity: true },
  });
  return agg._sum.quantity ?? 0;
}

// ─── LIST ─────────────────────────────────────────────────────────────────────

export async function getEventAllocations(eventId: string) {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) throw new HttpError(404, 'NOT_FOUND', 'Event not found.');

  return prisma.equipmentAllocation.findMany({
    where: { eventId },
    orderBy: { createdAt: 'asc' },
    include: {
      equipment: {
        select: {
          id: true,
          code: true,
          name: true,
          usableQuantity: true,
          condition: true,
          category: { select: { id: true, name: true } },
        },
      },
    },
  });
}

// ─── CREATE (with SELECT FOR UPDATE) ─────────────────────────────────────────

export async function createAllocation(
  eventId: string,
  input: CreateAllocationInput,
  actorId: string,
) {
  // Pre-checks outside transaction (read-only, no locking needed)
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) throw new HttpError(404, 'NOT_FOUND', 'Event not found.');

  if (['COMPLETED', 'CANCELLED'].includes(event.status)) {
    throw new HttpError(422, 'INVALID_STATE', `Cannot add allocation to a ${event.status} event.`);
  }

  const startAt = new Date(input.startAt);
  const endAt = new Date(input.endAt);

  return prisma.$transaction(async (tx) => {
    // ⚠️ CRITICAL: Lock equipment row FIRST to prevent concurrent double-booking
    const rows = await tx.$queryRaw<EquipmentRow[]>`
      SELECT id, usable_quantity, is_active
      FROM equipment
      WHERE id = ${input.equipmentId}
      FOR UPDATE
    `;

    if (rows.length === 0) {
      throw new HttpError(404, 'NOT_FOUND', 'Equipment not found.');
    }

    const equipment = rows[0]!;
    if (!equipment.is_active) {
      throw new HttpError(422, 'INACTIVE_EQUIPMENT', 'Equipment is not active.');
    }

    // Check stock with allocated lock held
    const allocatedOnInterval = await sumActiveAllocations(tx, input.equipmentId, startAt, endAt);
    const available = availableStock({
      usableQuantity: equipment.usable_quantity,
      allocatedOnInterval,
    });

    if (available < input.quantity) {
      throw new HttpError(
        409,
        'INSUFFICIENT_STOCK',
        `Peralatan sudah digunakan pada rentang waktu tersebut. Hanya ${available} unit tersedia (diminta ${input.quantity}).`,
        {
          available,
          requested: input.quantity,
          requestedInterval: { startAt: startAt.toISOString(), endAt: endAt.toISOString() },
        },
      );
    }

    // Determine initial status based on event state
    const allocationStatus = event.status === 'DRAFT' ? 'PENDING' : 'ACTIVE';

    // Unique constraint (eventId, equipmentId) will catch duplicates at DB level
    const allocation = await tx.equipmentAllocation.create({
      data: {
        eventId,
        equipmentId: input.equipmentId,
        quantity: input.quantity,
        status: allocationStatus,
        startAt,
        endAt,
        notes: input.notes ?? null,
      },
      include: {
        equipment: { select: { id: true, code: true, name: true } },
      },
    });

    await tx.auditLog.create({
      data: {
        actorId,
        action: 'ALLOCATION_CREATE',
        entityType: 'equipment_allocation',
        entityId: allocation.id,
        result: 'SUCCESS',
        reason: `qty=${input.quantity} status=${allocationStatus}`,
      },
    });

    return allocation;
  });
}

// ─── UPDATE ───────────────────────────────────────────────────────────────────

export async function updateAllocation(
  eventId: string,
  allocationId: string,
  input: UpdateAllocationInput,
  actorId: string,
) {
  const existing = await prisma.equipmentAllocation.findUnique({
    where: { id: allocationId },
  });

  if (!existing || existing.eventId !== eventId) {
    throw new HttpError(404, 'NOT_FOUND', 'Allocation not found on this event.');
  }
  if (existing.status === 'CANCELLED') {
    throw new HttpError(422, 'INVALID_STATE', 'Cannot modify a cancelled allocation.');
  }

  const newStartAt = input.startAt !== undefined ? new Date(input.startAt) : existing.startAt;
  const newEndAt = input.endAt !== undefined ? new Date(input.endAt) : existing.endAt;
  const newQuantity = input.quantity ?? existing.quantity;

  return prisma.$transaction(async (tx) => {
    // Lock equipment row before recalculating stock
    const rows = await tx.$queryRaw<EquipmentRow[]>`
      SELECT id, usable_quantity, is_active
      FROM equipment
      WHERE id = ${existing.equipmentId}
      FOR UPDATE
    `;

    if (rows.length === 0) throw new HttpError(404, 'NOT_FOUND', 'Equipment not found.');

    const equipment = rows[0]!;
    const allocatedOnInterval = await sumActiveAllocations(
      tx,
      existing.equipmentId,
      newStartAt,
      newEndAt,
      allocationId, // exclude self
    );
    const available = availableStock({
      usableQuantity: equipment.usable_quantity,
      allocatedOnInterval,
    });

    if (available < newQuantity) {
      throw new HttpError(
        409,
        'INSUFFICIENT_STOCK',
        `Peralatan sudah digunakan pada rentang waktu tersebut. Hanya ${available} unit tersedia (diminta ${newQuantity}).`,
        {
          available,
          requested: newQuantity,
          requestedInterval: { startAt: newStartAt.toISOString(), endAt: newEndAt.toISOString() },
        },
      );
    }

    const data: Parameters<typeof tx.equipmentAllocation.update>[0]['data'] = {};
    if (input.quantity !== undefined) data.quantity = input.quantity;
    if (input.startAt !== undefined) data.startAt = new Date(input.startAt);
    if (input.endAt !== undefined) data.endAt = new Date(input.endAt);
    if (input.notes !== undefined) data.notes = input.notes;

    const updated = await tx.equipmentAllocation.update({
      where: { id: allocationId },
      data,
      include: { equipment: { select: { id: true, code: true, name: true } } },
    });

    await tx.auditLog.create({
      data: {
        actorId,
        action: 'ALLOCATION_UPDATE',
        entityType: 'equipment_allocation',
        entityId: allocationId,
        result: 'SUCCESS',
      },
    });

    return updated;
  });
}

// ─── CANCEL ───────────────────────────────────────────────────────────────────

export async function cancelAllocation(eventId: string, allocationId: string, actorId: string) {
  const existing = await prisma.equipmentAllocation.findUnique({ where: { id: allocationId } });
  if (!existing || existing.eventId !== eventId) {
    throw new HttpError(404, 'NOT_FOUND', 'Allocation not found on this event.');
  }
  if (existing.status === 'CANCELLED') {
    throw new HttpError(422, 'INVALID_STATE', 'Allocation is already cancelled.');
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.equipmentAllocation.update({
      where: { id: allocationId },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
      include: { equipment: { select: { id: true, code: true, name: true } } },
    });

    await tx.auditLog.create({
      data: {
        actorId,
        action: 'ALLOCATION_CANCEL',
        entityType: 'equipment_allocation',
        entityId: allocationId,
        result: 'SUCCESS',
      },
    });

    return updated;
  });
}
