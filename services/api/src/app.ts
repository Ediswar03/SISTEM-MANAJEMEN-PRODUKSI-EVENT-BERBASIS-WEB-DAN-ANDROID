import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import type { Env } from './config/env.js';
import { errorHandler } from './middleware/error-handler.js';
import { notFound } from './middleware/not-found.js';
import { healthRouter } from './modules/health/health.routes.js';
import { makeAuthRouter } from './modules/auth/auth.routes.js';
import { makeEventsRouter } from './modules/events/events.routes.js';
import { makeEquipmentRouter } from './modules/equipment/equipment.routes.js';
import { makeAllocationsRouter } from './modules/allocations/allocations.routes.js';
import { makeAssignmentsRouter } from './modules/assignments/assignments.routes.js';
import { makeUsersRouter } from './modules/users/users.routes.js';
import { openApiDocument } from './openapi.js';

export function createApp(env: Env) {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(
    cors({
      origin: env.CORS_ORIGIN.split(',').map((v) => v.trim()),
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '1mb' }));

  // Health check at root (without prefix) for uptime monitors
  app.use('/health', healthRouter);

  const api = express.Router();

  // Health
  api.use('/health', healthRouter);

  // Auth
  api.use('/auth', makeAuthRouter(env));

  // Users
  api.use('/users', makeUsersRouter(env));

  // Events (+ nested allocations and assignments under /:eventId/...)
  const eventsRouter = makeEventsRouter(env);
  eventsRouter.use('/:eventId/allocations', makeAllocationsRouter(env));
  eventsRouter.use('/:eventId/assignments', makeAssignmentsRouter(env));
  api.use('/events', eventsRouter);

  // Equipment (+ categories under /equipment/categories)
  api.use('/equipment', makeEquipmentRouter(env));

  // API documentation
  api.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiDocument, { customSiteTitle: 'EPMS API' }));
  api.get('/openapi.json', (_req, res) => {
    res.json(openApiDocument);
  });

  app.use(env.API_PREFIX, api);
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
