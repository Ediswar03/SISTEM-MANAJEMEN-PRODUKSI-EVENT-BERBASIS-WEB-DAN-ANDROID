import { Router } from 'express';
import type { Env } from '../../config/env.js';
import { authenticate, requireRole } from '../../middleware/authenticate.js';
import * as ctrl from './allocations.controller.js';

/**
 * Mounted under /events/:eventId/allocations
 * Router is merged with the events router, so we use mergeParams: true.
 */
export function makeAllocationsRouter(env: Env): Router {
  const router = Router({ mergeParams: true });
  const auth = authenticate(env);
  const adminOnly = requireRole('ADMIN');

  // GET    /events/:eventId/allocations
  router.get('/', auth, (req, res, next) => void ctrl.listAllocations(req, res, next));

  // POST   /events/:eventId/allocations
  router.post('/', auth, adminOnly, (req, res, next) => void ctrl.createAllocation(req, res, next));

  // PATCH  /events/:eventId/allocations/:allocationId
  router.patch('/:allocationId', auth, adminOnly, (req, res, next) =>
    void ctrl.updateAllocation(req, res, next),
  );

  // DELETE /events/:eventId/allocations/:allocationId  (cancel)
  router.delete('/:allocationId', auth, adminOnly, (req, res, next) =>
    void ctrl.cancelAllocation(req, res, next),
  );

  return router;
}
