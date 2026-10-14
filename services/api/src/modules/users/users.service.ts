import argon2 from 'argon2';
import { prisma } from '../../lib/prisma.js';
import { HttpError } from '../../lib/http-error.js';
import type { CreateUserInput, UpdateUserInput, ChangePasswordInput, UserQueryInput } from './users.schemas.js';

const SAFE_USER_SELECT = {
  id: true,
  email: true,
  fullName: true,
  role: true,
  isActive: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
  crewProfile: {
    select: { id: true, phone: true, skills: true, notes: true, isActive: true },
  },
} as const;

// ─── LIST ─────────────────────────────────────────────────────────────────────

export async function getUsers(query: UserQueryInput) {
  const { role, isActive, search, page, limit } = query;
  const skip = (page - 1) * limit;

  const where = {
    ...(role !== undefined ? { role } : {}),
    ...(isActive !== undefined ? { isActive } : {}),
    ...(search
      ? { OR: [{ fullName: { contains: search } }, { email: { contains: search } }] }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { fullName: 'asc' },
      select: SAFE_USER_SELECT,
    }),
    prisma.user.count({ where }),
  ]);

  return { data: items, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

// ─── GET BY ID ────────────────────────────────────────────────────────────────

export async function getUserById(id: string) {
  const user = await prisma.user.findUnique({ where: { id }, select: SAFE_USER_SELECT });
  if (!user) throw new HttpError(404, 'NOT_FOUND', 'User not found.');
  return user;
}

// ─── CREATE ───────────────────────────────────────────────────────────────────

export async function createUser(input: CreateUserInput, actorId: string) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw new HttpError(409, 'DUPLICATE_EMAIL', `Email '${input.email}' is already registered.`);

  const passwordHash = await argon2.hash(input.password);

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: input.email,
        passwordHash,
        fullName: input.fullName,
        role: input.role,
        isActive: true,
      },
      select: SAFE_USER_SELECT,
    });

    // Create crew profile for CREW role users
    if (input.role === 'CREW') {
      await tx.crewProfile.create({
        data: {
          userId: user.id,
          skills: input.skills ?? '',
          phone: input.phone ?? null,
          notes: input.notes ?? null,
        },
      });
    }

    await tx.auditLog.create({
      data: {
        actorId,
        action: 'USER_CREATE',
        entityType: 'user',
        entityId: user.id,
        result: 'SUCCESS',
        reason: `role=${input.role}`,
      },
    });

    // Re-fetch with crew profile included
    return tx.user.findUnique({ where: { id: user.id }, select: SAFE_USER_SELECT });
  });
}

// ─── UPDATE ───────────────────────────────────────────────────────────────────

export async function updateUser(id: string, input: UpdateUserInput, actorId: string) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new HttpError(404, 'NOT_FOUND', 'User not found.');

  return prisma.$transaction(async (tx) => {
    const userUpdateData: Parameters<typeof tx.user.update>[0]['data'] = {};
    if (input.fullName !== undefined) userUpdateData.fullName = input.fullName;
    if (input.isActive !== undefined) userUpdateData.isActive = input.isActive;

    const updatedUser = await tx.user.update({
      where: { id },
      data: userUpdateData,
      select: SAFE_USER_SELECT,
    });

    // Update crew profile if it exists
    if (user.role === 'CREW') {
      const profile = await tx.crewProfile.findUnique({ where: { userId: id } });
      if (profile) {
        const profileData: Parameters<typeof tx.crewProfile.update>[0]['data'] = {};
        if (input.phone !== undefined) profileData.phone = input.phone;
        if (input.skills !== undefined) profileData.skills = input.skills;
        if (input.notes !== undefined) profileData.notes = input.notes;

        await tx.crewProfile.update({ where: { userId: id }, data: profileData });
      }
    }

    await tx.auditLog.create({
      data: { actorId, action: 'USER_UPDATE', entityType: 'user', entityId: id, result: 'SUCCESS' },
    });

    return tx.user.findUnique({ where: { id }, select: SAFE_USER_SELECT });
  });
}

// ─── CHANGE PASSWORD ─────────────────────────────────────────────────────────

export async function changePassword(id: string, input: ChangePasswordInput) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new HttpError(404, 'NOT_FOUND', 'User not found.');

  const valid = await argon2.verify(user.passwordHash, input.currentPassword);
  if (!valid) throw new HttpError(401, 'INVALID_CREDENTIALS', 'Current password is incorrect.');

  const newHash = await argon2.hash(input.newPassword);
  await prisma.user.update({ where: { id }, data: { passwordHash: newHash } });

  // Revoke all refresh tokens to force re-login everywhere
  await prisma.refreshToken.updateMany({
    where: { userId: id, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

// ─── GET CREW SCHEDULE ────────────────────────────────────────────────────────

export async function getCrewSchedule(userId: string) {
  const profile = await prisma.crewProfile.findUnique({ where: { userId } });
  if (!profile) throw new HttpError(404, 'NOT_FOUND', 'Crew profile not found.');

  return prisma.crewAssignment.findMany({
    where: { crewProfileId: profile.id, status: 'ACTIVE' },
    orderBy: { startAt: 'asc' },
    include: {
      event: { select: { id: true, code: true, name: true, location: true, startAt: true, endAt: true, status: true } },
    },
  });
}
