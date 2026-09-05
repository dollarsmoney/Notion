import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { env } from '../config/env';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const notFound: RequestHandler = (req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Validation failed',
      details: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message, details: err.details });
    return;
  }

  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    ...(env.NODE_ENV !== 'production' && { details: (err as Error)?.message }),
  });
};

/** Express 5 types repeated route params as string[]; our routes only use single values. */
export function param(value: string | string[] | undefined): string {
  if (typeof value !== 'string') throw new AppError(400, 'Invalid route parameter');
  return value;
}
