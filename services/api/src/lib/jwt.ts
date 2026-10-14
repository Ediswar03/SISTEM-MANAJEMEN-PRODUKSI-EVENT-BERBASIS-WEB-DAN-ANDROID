import jwt from 'jsonwebtoken';
import type { Env } from '../config/env.js';

export type AccessTokenPayload = {
  sub: string; // userId
  role: 'ADMIN' | 'CREW';
  email: string;
};

export type RefreshTokenPayload = {
  sub: string; // userId
  jti: string; // tokenId (UUID) stored in DB
};

export function signAccessToken(payload: AccessTokenPayload, env: Env): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions['expiresIn'] & string,
    issuer: 'epms-api',
    audience: 'epms-client',
  });
}

export function signRefreshToken(payload: RefreshTokenPayload, env: Env): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions['expiresIn'] & string,
    issuer: 'epms-api',
    audience: 'epms-client',
  });
}

export function verifyAccessToken(token: string, env: Env): AccessTokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET, {
    issuer: 'epms-api',
    audience: 'epms-client',
  }) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string, env: Env): RefreshTokenPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET, {
    issuer: 'epms-api',
    audience: 'epms-client',
  }) as RefreshTokenPayload;
}
