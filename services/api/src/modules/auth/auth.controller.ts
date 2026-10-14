import type { Request, Response, NextFunction } from 'express';
import { loginSchema, refreshSchema } from './auth.schemas.js';
import { login, logout, refresh, getMe } from './auth.service.js';
import type { Env } from '../../config/env.js';

export function makeAuthController(env: Env) {
  return {
    async handleLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
      try {
        const input = loginSchema.parse(req.body);
        const result = await login(input, env);
        res.status(200).json({ data: result });
      } catch (err) {
        next(err);
      }
    },

    async handleRefresh(req: Request, res: Response, next: NextFunction): Promise<void> {
      try {
        const { refreshToken } = refreshSchema.parse(req.body);
        const result = await refresh(refreshToken, env);
        res.status(200).json({ data: result });
      } catch (err) {
        next(err);
      }
    },

    async handleLogout(req: Request, res: Response, next: NextFunction): Promise<void> {
      try {
        const { refreshToken } = refreshSchema.parse(req.body);
        await logout(refreshToken, env);
        res.status(204).send();
      } catch (err) {
        next(err);
      }
    },

    async handleGetMe(req: Request, res: Response, next: NextFunction): Promise<void> {
      try {
        const userId = req.user!.id;
        const user = await getMe(userId);
        res.status(200).json({ data: user });
      } catch (err) {
        next(err);
      }
    },
  };
}
