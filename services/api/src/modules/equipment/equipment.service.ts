import { prisma } from '../../lib/prisma.js';
import { HttpError } from '../../lib/http-error.js';
import type {
  CreateCategoryInput,
  UpdateCategoryInput,
  CreateEquipmentInput,
  UpdateEquipmentInput,
  EquipmentQueryInput,
  AvailabilityQueryInput,
} from './equipment.schemas.js';

// ─── Categories ───────────────────────────────────────────────────────────────

export async function getCategories() {
  return prisma.equipmentCategory.findMany({ orderBy: { name: 'asc' } });
}

export async function createCategory(input: CreateCategoryInput) {
  const existing = await prisma.equipmentCategory.findUnique({ where: { code: input.code } });
  if (existing) throw new HttpError(409, 'DUPLICATE_CODE', `Category code '${input.code}' already exists.`);

  return prisma.equipmentCategory.create({
    data: { code: input.code, name: input.name, description: input.description ?? null },
  });
}

export async function updateCategory(id: string, input: UpdateCategoryInput) {
  const cat = await prisma.equipmentCategory.findUnique({ where: { id } });
  if (!cat) throw new HttpError(404, 'NOT_FOUND', 'Equipment category not found.');

  const data: Parameters<typeof prisma.equipmentCategory.update>[0]['data'] = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.description !== undefined) data.description = input.description;

  return prisma.equipmentCategory.update({ where: { id }, data });
}

export async function deleteCategory(id: string) {
  const cat = await prisma.equipmentCategory.findUnique({ where: { id } });
  if (!cat) throw new HttpError(404, 'NOT_FOUND', 'Equipment category not found.');

  const count = await prisma.equipment.count({ where: { categoryId: id } });
  if (count > 0) {
    throw new HttpError(
      409,
      'CATEGORY_IN_USE',
      `Cannot delete category that has ${count} equipment item(s). Reassign or delete them first.`,
    );
  }

  await prisma.equipmentCategory.delete({ where: { id } });
}

// ─── Equipment Items ──────────────────────────────────────────────────────────

export async function getEquipment(query: EquipmentQueryInput) {
  const { categoryId, isActive, search, page, limit } = query;
  const skip = (page - 1) * limit;

  const where = {
    ...(categoryId !== undefined ? { categoryId } : {}),
    ...(isActive !== undefined ? { isActive } : {}),
    ...(search
      ? { OR: [{ name: { contains: search } }, { code: { contains: search } }] }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.equipment.findMany({
      where,
      skip,
      take: limit,
      orderBy: { name: 'asc' },
      include: { category: { select: { id: true, code: true, name: true } } },
    }),
    prisma.equipment.count({ where }),
  ]);

  return { data: items, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

export async function getEquipmentById(id: string) {
  const item = await prisma.equipment.findUnique({
    where: { id },
    include: {
      category: true,
      allocations: {
        where: { status: { not: 'CANCELLED' } },
        orderBy: { startAt: 'asc' },
        include: { event: { select: { id: true, code: true, name: true, status: true } } },
      },
    },
  });
  if (!item) throw new HttpError(404, 'NOT_FOUND', 'Equipment not found.');
  return item;
}

export async function createEquipment(input: CreateEquipmentInput, actorId: string) {
  const cat = await prisma.equipmentCategory.findUnique({ where: { id: input.categoryId } });
  if (!cat) throw new HttpError(404, 'NOT_FOUND', 'Equipment category not found.');

  const existing = await prisma.equipment.findUnique({ where: { code: input.code } });
  if (existing) throw new HttpError(409, 'DUPLICATE_CODE', `Equipment code '${input.code}' already exists.`);

  if (input.usableQuantity > input.quantityOnHand) {
    throw new HttpError(422, 'INVALID_QUANTITY', 'usableQuantity cannot exceed quantityOnHand.');
  }

  const item = await prisma.equipment.create({
    data: {
      categoryId: input.categoryId,
      code: input.code,
      name: input.name,
      description: input.description ?? null,
      quantityOnHand: input.quantityOnHand,
      usableQuantity: input.usableQuantity,
      condition: input.condition,
      storageLocation: input.storageLocation,
      notes: input.notes ?? null,
    },
  });

  await prisma.auditLog.create({
    data: { actorId, action: 'EQUIPMENT_CREATE', entityType: 'equipment', entityId: item.id, result: 'SUCCESS' },
  });

  return item;
}

export async function updateEquipment(id: string, input: UpdateEquipmentInput, actorId: string) {
  const item = await prisma.equipment.findUnique({ where: { id } });
  if (!item) throw new HttpError(404, 'NOT_FOUND', 'Equipment not found.');

  if (input.categoryId !== undefined) {
    const cat = await prisma.equipmentCategory.findUnique({ where: { id: input.categoryId } });
    if (!cat) throw new HttpError(404, 'NOT_FOUND', 'Equipment category not found.');
  }

  const newUsable = input.usableQuantity ?? item.usableQuantity;
  const newOnHand = input.quantityOnHand ?? item.quantityOnHand;
  if (newUsable > newOnHand) {
    throw new HttpError(422, 'INVALID_QUANTITY', 'usableQuantity cannot exceed quantityOnHand.');
  }

  const data: Parameters<typeof prisma.equipment.update>[0]['data'] = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.description !== undefined) data.description = input.description;
  if (input.quantityOnHand !== undefined) data.quantityOnHand = input.quantityOnHand;
  if (input.usableQuantity !== undefined) data.usableQuantity = input.usableQuantity;
  if (input.condition !== undefined) data.condition = input.condition;
  if (input.storageLocation !== undefined) data.storageLocation = input.storageLocation;
  if (input.notes !== undefined) data.notes = input.notes;
  if (input.isActive !== undefined) data.isActive = input.isActive;
  if (input.categoryId !== undefined) data.categoryId = input.categoryId;

  const updated = await prisma.equipment.update({ where: { id }, data });

  await prisma.auditLog.create({
    data: { actorId, action: 'EQUIPMENT_UPDATE', entityType: 'equipment', entityId: id, result: 'SUCCESS' },
  });

  return updated;
}

export async function getEquipmentAvailability(
  id: string,
  query: AvailabilityQueryInput,
) {
  const item = await prisma.equipment.findUnique({ where: { id } });
  if (!item) throw new HttpError(404, 'NOT_FOUND', 'Equipment not found.');

  const startAt = new Date(query.startAt);
  const endAt = new Date(query.endAt);

  if (startAt >= endAt) {
    throw new HttpError(422, 'INVALID_INTERVAL', 'startAt must be strictly before endAt.');
  }

  const agg = await prisma.equipmentAllocation.aggregate({
    where: {
      equipmentId: id,
      status: 'ACTIVE',
      startAt: { lt: endAt },
      endAt: { gt: startAt },
    },
    _sum: { quantity: true },
  });

  const allocated = agg._sum.quantity ?? 0;
  const available = item.usableQuantity - allocated;

  return {
    equipmentId: id,
    usableQuantity: item.usableQuantity,
    allocatedOnInterval: allocated,
    availableOnInterval: Math.max(0, available),
    startAt: query.startAt,
    endAt: query.endAt,
  };
}
