import { Router } from 'express';
import type { Env } from '../../config/env.js';
import { authenticate, requireRole } from '../../middleware/authenticate.js';
import * as ctrl from './users.controller.js';

export function makeUsersRouter(env: Env): Router {
  const router = Router();
  const auth = authenticate(env);
  const adminOnly = requireRole('ADMIN');

  // GET /users            — ADMIN only
  router.get('/', auth, adminOnly, (req, res, next) => void ctrl.listUsers(req, res, next));

  // POST /users           — ADMIN only (create new user)
  router.post('/', auth, adminOnly, (req, res, next) => void ctrl.createUser(req, res, next));

  // GET /users/me/schedule — crew can get their own schedule
  router.get('/me/schedule', auth, (req, res, next) => void ctrl.getMySchedule(req, res, next));

  // POST /users/me/password — any authenticated user can change own password
  router.post('/me/password', auth, (req, res, next) => void ctrl.changePassword(req, res, next));

  // GET  /users/:id       — ADMIN only
  router.get('/:id', auth, adminOnly, (req, res, next) => void ctrl.getUser(req, res, next));

  // PATCH /users/:id      — ADMIN only
  router.patch('/:id', auth, adminOnly, (req, res, next) => void ctrl.updateUser(req, res, next));

  return router;
}
