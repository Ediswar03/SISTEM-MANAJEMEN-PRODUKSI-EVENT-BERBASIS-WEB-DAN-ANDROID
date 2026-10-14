import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../lib/jwt.js';
import { HttpError } from '../lib/http-error.js';
import type { Env } from '../config/env.js';
import type { UserRole } from '@epms/shared';

/** Attached to req after successful authentication. */
export type AuthenticatedUser = {
  id: string;
  email: string;
  role: UserRole;
};

// Extend Express Request to carry the authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

/**
 * Middleware: verify Bearer access token.
 * On success, attaches `req.user`. On failure, passes HttpError 401.
 */
export function authenticate(env: Env) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      next(new HttpError(401, 'MISSING_TOKEN', 'Authentication token is required.'));
      return;
    }

    const token = authHeader.slice(7);
    try {
      const payload = verifyAccessToken(token, env);
      req.user = {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
      };
      next();
    } catch {
      next(new HttpError(401, 'INVALID_TOKEN', 'Token is invalid or has expired.'));
    }
  };
}

/**
 * Middleware: require specific role(s). Must be used after `authenticate`.
 */
export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new HttpError(401, 'MISSING_TOKEN', 'Authentication required.'));
      return;
    }
    if (!roles.includes(req.user.role)) {
      next(new HttpError(403, 'FORBIDDEN', 'You do not have permission to perform this action.'));
      return;
    }
    next();
  };
}
