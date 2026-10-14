import { Router } from 'express';
import type { Env } from '../../config/env.js';
import { authenticate, requireRole } from '../../middleware/authenticate.js';
import * as ctrl from './equipment.controller.js';

export function makeEquipmentRouter(env: Env): Router {
  const router = Router();
  const auth = authenticate(env);
  const adminOnly = requireRole('ADMIN');

  // ─ Categories ──────────────────────────────────────────────────────────────
  router.get('/categories', auth, (req, res, next) => void ctrl.listCategories(req, res, next));
  router.post('/categories', auth, adminOnly, (req, res, next) => void ctrl.createCategory(req, res, next));
  router.patch('/categories/:id', auth, adminOnly, (req, res, next) => void ctrl.updateCategory(req, res, next));
  router.delete('/categories/:id', auth, adminOnly, (req, res, next) => void ctrl.deleteCategory(req, res, next));

  // ─ Equipment Items ─────────────────────────────────────────────────────────
  router.get('/', auth, (req, res, next) => void ctrl.listEquipment(req, res, next));
  router.post('/', auth, adminOnly, (req, res, next) => void ctrl.createEquipment(req, res, next));
  router.get('/:id', auth, (req, res, next) => void ctrl.getEquipment(req, res, next));
  router.patch('/:id', auth, adminOnly, (req, res, next) => void ctrl.updateEquipment(req, res, next));

  // GET /equipment/:id/availability?startAt=...&endAt=...
  router.get('/:id/availability', auth, (req, res, next) => void ctrl.getAvailability(req, res, next));

  return router;
}
