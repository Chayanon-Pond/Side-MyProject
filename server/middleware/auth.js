import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { AppError } from '../lib/errors.js';

const VERIFY_OPTIONS = { algorithms: ['HS256'] };

export function signToken(user) {
  return jwt.sign(
    { userId: user.id, username: user.username, role: user.role },
    config.jwtSecret,
    { algorithm: 'HS256', expiresIn: config.jwtExpiresIn },
  );
}

function extractToken(req) {
  const header = req.headers.authorization;
  if (!header) return null;
  const [scheme, token] = header.split(' ');
  if (!/^Bearer$/i.test(scheme) || !token) return null;
  return token;
}

function toUser(decoded) {
  return { id: decoded.userId, username: decoded.username, role: decoded.role };
}

/** Requires a valid token. Missing/invalid/expired -> 401. */
export function authenticateToken(req, res, next) {
  const token = extractToken(req);
  if (!token) return next(AppError.unauthorized('No token provided', 'NO_TOKEN'));
  try {
    const decoded = jwt.verify(token, config.jwtSecret, VERIFY_OPTIONS);
    req.user = toUser(decoded);
    return next();
  } catch (err) {
    const code = err?.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN';
    return next(AppError.unauthorized('Invalid or expired token', code));
  }
}

/**
 * Attaches req.user when a valid token is present; otherwise continues anonymously.
 * Used on public routes that show more to admins (e.g. drafts).
 */
export function optionalAuth(req, res, next) {
  const token = extractToken(req);
  if (token) {
    try {
      req.user = toUser(jwt.verify(token, config.jwtSecret, VERIFY_OPTIONS));
    } catch {
      req.user = undefined;
    }
  }
  next();
}

/** Must run after authenticateToken. Wrong role -> 403. */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(AppError.unauthorized());
    if (!roles.includes(req.user.role)) {
      return next(AppError.forbidden('Insufficient permissions', 'FORBIDDEN_ROLE'));
    }
    next();
  };
}

export const isAdmin = (req) => req.user?.role === 'admin';
