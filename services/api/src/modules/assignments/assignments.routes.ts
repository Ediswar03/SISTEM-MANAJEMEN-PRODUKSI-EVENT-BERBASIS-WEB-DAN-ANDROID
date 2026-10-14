import { Router } from 'express';
import type { Env } from '../../config/env.js';
import { authenticate, requireRole } from '../../middleware/authenticate.js';
import * as ctrl from './assignments.controller.js';

/** Mounted under /events/:eventId/assignments */
export function makeAssignmentsRouter(env: Env): Router {
  const router = Router({ mergeParams: true });
  const auth = authenticate(env);
  const adminOnly = requireRole('ADMIN');

  router.get('/', auth, (req, res, next) => void ctrl.listAssignments(req, res, next));
  router.post('/', auth, adminOnly, (req, res, next) => void ctrl.createAssignment(req, res, next));
  router.patch('/:assignmentId', auth, adminOnly, (req, res, next) =>
    void ctrl.updateAssignment(req, res, next),
  );
  router.delete('/:assignmentId', auth, adminOnly, (req, res, next) =>
    void ctrl.cancelAssignment(req, res, next),
  );

  return router;
}
