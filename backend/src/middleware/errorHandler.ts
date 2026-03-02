import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code: string = 'InternalError'
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.code,
      message: err.message,
      statusCode: err.statusCode,
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'ValidationError',
      message: 'Request body failed validation',
      statusCode: 400,
      details: err.flatten(),
    });
    return;
  }

  const isDev = process.env.NODE_ENV === 'development';
  if (isDev) {
    console.error('[Error]', err);
  }
  // Never include stack in response — only sanitized message is sent to client
  const message = err instanceof Error ? err.message : 'An unexpected error occurred';
  res.status(500).json({
    error: 'InternalError',
    message: 'An unexpected error occurred',
    statusCode: 500,
    ...(isDev && { details: message }),
  });
}
