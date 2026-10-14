import crypto from 'node:crypto';
import argon2 from 'argon2';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../../lib/prisma.js';
import { HttpError } from '../../lib/http-error.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../lib/jwt.js';
import type { Env } from '../../config/env.js';
import type { LoginInput } from './auth.schemas.js';

const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function login(input: LoginInput, env: Env) {
  // 1. Find user by email — don't reveal whether email exists on mismatch
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user || !user.isActive) {
    throw new HttpError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.');
  }

  // 2. Verify password with Argon2id
  const valid = await argon2.verify(user.passwordHash, input.password);
  if (!valid) {
    throw new HttpError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.');
  }

  // 3. Generate tokens
  const accessToken = signAccessToken(
    { sub: user.id, role: user.role, email: user.email },
    env,
  );
  const rawRefreshToken = uuidv4();
  const tokenId = uuidv4();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

  // 4. Store hashed refresh token
  await prisma.$transaction([
    prisma.refreshToken.create({
      data: {
        id: tokenId,
        userId: user.id,
        tokenHash: hashToken(rawRefreshToken),
        expiresAt,
      },
    }),
    prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    }),
    prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: 'AUTH_LOGIN',
        entityType: 'user',
        entityId: user.id,
        result: 'SUCCESS',
      },
    }),
  ]);

  const signedRefreshToken = signRefreshToken({ sub: user.id, jti: tokenId }, env);

  return {
    accessToken,
    refreshToken: signedRefreshToken,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
    },
  };
}

export async function refresh(rawRefreshToken: string, env: Env) {
  // 1. Verify JWT signature and expiry
  let payload: { sub: string; jti: string };
  try {
    payload = verifyRefreshToken(rawRefreshToken, env) as { sub: string; jti: string };
  } catch {
    throw new HttpError(401, 'INVALID_TOKEN', 'Refresh token is invalid or has expired.');
  }

  // 2. Lookup stored token by jti (tokenId)
  const stored = await prisma.refreshToken.findUnique({ where: { id: payload.jti } });
  if (!stored || stored.revokedAt !== null || stored.expiresAt < new Date()) {
    throw new HttpError(401, 'INVALID_TOKEN', 'Refresh token is invalid or has been revoked.');
  }

  // 3. Rotate: revoke old, create new
  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user || !user.isActive) {
    throw new HttpError(401, 'INVALID_TOKEN', 'User account is not active.');
  }

  const newRawToken = uuidv4();
  const newTokenId = uuidv4();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

  await prisma.$transaction([
    prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    }),
    prisma.refreshToken.create({
      data: {
        id: newTokenId,
        userId: user.id,
        tokenHash: hashToken(newRawToken),
        expiresAt,
      },
    }),
  ]);

  const accessToken = signAccessToken({ sub: user.id, role: user.role, email: user.email }, env);
  const newSignedRefreshToken = signRefreshToken({ sub: user.id, jti: newTokenId }, env);

  return { accessToken, refreshToken: newSignedRefreshToken };
}

export async function logout(rawRefreshToken: string, env: Env): Promise<void> {
  let payload: { sub: string; jti: string };
  try {
    payload = verifyRefreshToken(rawRefreshToken, env) as { sub: string; jti: string };
  } catch {
    // If token is already invalid, logout is effectively a no-op — don't reveal info
    return;
  }

  await prisma.refreshToken
    .updateMany({
      where: { id: payload.jti, revokedAt: null },
      data: { revokedAt: new Date() },
    })
    .catch(() => {
      // Best-effort revocation — don't throw if already revoked
    });
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
      crewProfile: {
        select: {
          id: true,
          phone: true,
          skills: true,
          notes: true,
          isActive: true,
        },
      },
    },
  });

  if (!user) {
    throw new HttpError(404, 'NOT_FOUND', 'User not found.');
  }

  return user;
}
