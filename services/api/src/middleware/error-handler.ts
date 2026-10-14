import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { HttpError } from '../lib/http-error.js';

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof HttpError) {
    res.status(err.status).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details ?? null,
      },
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed.',
        details: err.issues,
      },
    });
    return;
  }

  // Express body-parser passes a SyntaxError with status=400 when the request
  // body contains malformed JSON. Treat it as a client error, not a server error.
  if (
    err instanceof SyntaxError &&
    'status' in err &&
    (err as SyntaxError & { status: number }).status === 400
  ) {
    res.status(400).json({
      error: {
        code: 'INVALID_JSON',
        message: 'Request body contains malformed JSON.',
        details: null,
      },
    });
    return;
  }

  console.error('[unhandled-error]', err instanceof Error ? err.message : 'unknown');
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred.',
      details: null,
    },
  });
}
