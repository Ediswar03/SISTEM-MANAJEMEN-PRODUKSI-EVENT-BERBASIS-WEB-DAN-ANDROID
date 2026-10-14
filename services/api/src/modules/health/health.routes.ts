import { Router } from 'express';
import { healthController } from './health.controller.js';

export const healthRouter = Router();

healthRouter.get('/', (req, res, next) => {
  void healthController(req, res).catch(next);
});
