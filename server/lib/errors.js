import multer from 'multer';
import { ZodError } from 'zod';
import logger from './logger.js';

export class AppError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }

  static badRequest(message = 'Bad request', code = 'BAD_REQUEST', details) {
    return new AppError(400, code, message, details);
  }
  static unauthorized(message = 'Authentication required', code = 'UNAUTHORIZED') {
    return new AppError(401, code, message);
  }
  static forbidden(message = 'Forbidden', code = 'FORBIDDEN') {
    return new AppError(403, code, message);
  }
  static notFound(message = 'Not found', code = 'NOT_FOUND') {
    return new AppError(404, code, message);
  }
  static conflict(message = 'Conflict', code = 'CONFLICT') {
    return new AppError(409, code, message);
  }
}

/** Wrap an async route handler so rejections reach the error handler. */
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

export function notFoundHandler(req, res) {
  res.status(404).json({ error: 'Route not found', code: 'ROUTE_NOT_FOUND' });
}

/**
 * Central error handler. Response shape: { error: <message string>, code, details? }
 * (top-level string `error` keeps existing client readers working).
 */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof ZodError) {
    const details = err.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
    const first = details[0];
    return res.status(400).json({
      error: first ? `Invalid ${first.path || 'input'}: ${first.message}` : 'Invalid input',
      code: 'VALIDATION_ERROR',
      details,
    });
  }
  if (err instanceof AppError) {
    const body = { error: err.message, code: err.code };
    if (err.details) body.details = err.details;
    return res.status(err.status).json(body);
  }
  if (err instanceof multer.MulterError) {
    const message = err.code === 'LIMIT_FILE_SIZE' ? 'File too large (max 5MB)' : err.message;
    return res.status(400).json({ error: message, code: 'UPLOAD_ERROR' });
  }
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request body too large', code: 'PAYLOAD_TOO_LARGE' });
  }
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Malformed JSON body', code: 'BAD_JSON' });
  }
  // Postgres unique violation
  if (err?.code === '23505') {
    return res.status(409).json({ error: 'Resource already exists', code: 'CONFLICT' });
  }
  // Postgres FK violation
  if (err?.code === '23503') {
    return res.status(400).json({ error: 'Referenced resource does not exist', code: 'INVALID_REFERENCE' });
  }

  logger.error({ err: { message: err?.message, stack: err?.stack, code: err?.code }, path: req.path, method: req.method }, 'Unhandled error');
  return res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
}
