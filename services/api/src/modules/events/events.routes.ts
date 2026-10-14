import { Router } from 'express';
import type { Env } from '../../config/env.js';
import { authenticate, requireRole } from '../../middleware/authenticate.js';
import * as ctrl from './events.controller.js';

export function makeEventsRouter(env: Env): Router {
  const router = Router();
  const auth = authenticate(env);
  const adminOnly = requireRole('ADMIN');

  // GET  /events          — all authenticated users can list events
  router.get('/', auth, (req, res, next) => void ctrl.listEvents(req, res, next));

  // POST /events          — ADMIN only
  router.post('/', auth, adminOnly, (req, res, next) => void ctrl.createEvent(req, res, next));

  // GET  /events/:id      — all authenticated users
  router.get('/:id', auth, (req, res, next) => void ctrl.getEvent(req, res, next));

  // PATCH /events/:id     — ADMIN only
  router.patch('/:id', auth, adminOnly, (req, res, next) => void ctrl.updateEvent(req, res, next));

  // POST  /events/:id/status   — ADMIN only (status transition)
  router.post('/:id/status', auth, adminOnly, (req, res, next) =>
    void ctrl.transitionStatus(req, res, next),
  );

  return router;
}
