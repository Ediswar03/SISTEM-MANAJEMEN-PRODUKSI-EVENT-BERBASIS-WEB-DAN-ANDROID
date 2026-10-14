import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { makeAuthController } from './auth.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import type { Env } from '../../config/env.js';

const loginLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  limit: 10,           // max 10 attempts per minute per IP
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many login attempts. Please try again after 1 minute.',
      details: null,
    },
  },
  skipSuccessfulRequests: false,
});

export function makeAuthRouter(env: Env): Router {
  const router = Router();
  const controller = makeAuthController(env);

  // POST /auth/login — rate-limited
  router.post('/login', loginLimiter, (req, res, next) => {
    void controller.handleLogin(req, res, next);
  });

  // POST /auth/refresh
  router.post('/refresh', (req, res, next) => {
    void controller.handleRefresh(req, res, next);
  });

  // POST /auth/logout
  router.post('/logout', (req, res, next) => {
    void controller.handleLogout(req, res, next);
  });

  // GET /auth/me — requires valid access token
  router.get('/me', authenticate(env), (req, res, next) => {
    void controller.handleGetMe(req, res, next);
  });

  return router;
}
