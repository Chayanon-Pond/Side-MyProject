import dotenv from 'dotenv';

dotenv.config({ quiet: true });

const NODE_ENV = process.env.NODE_ENV || 'development';
const isProduction = NODE_ENV === 'production';
const isTest = NODE_ENV === 'test' || !!process.env.VITEST;

const DEV_JWT_SECRET = 'dev-only-insecure-jwt-secret-change-me';

function parseList(value) {
  return String(value || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Throws when a required production setting is missing. Called once at boot
 * (server.js) so a misconfigured deploy fails fast instead of signing tokens
 * with an undefined secret.
 */
export function assertProductionConfig() {
  if (isProduction && !process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET must be set in production');
  }
}

export const config = {
  env: NODE_ENV,
  isProduction,
  isTest,
  port: parseInt(process.env.PORT || '3001', 10),
  get jwtSecret() {
    if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
    if (isProduction) throw new Error('JWT_SECRET must be set in production');
    return DEV_JWT_SECRET;
  },
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  bcryptRounds: 12,
  corsOrigins: parseList(process.env.CORS_ORIGINS).length
    ? parseList(process.env.CORS_ORIGINS)
    : (isProduction ? [] : ['http://localhost:5173']),
  // Vercel preview deployments of this project only.
  corsPreviewRegex: /^https:\/\/side-my-project[-a-z0-9]*\.vercel\.app$/,
  logLevel: process.env.LOG_LEVEL || (isTest ? 'silent' : 'info'),
  appBaseUrl: process.env.APP_BASE_URL || 'http://localhost:5173',
  // Public origin of this API (e.g. https://api.example.com). Turns /uploads/... paths into
  // absolute URLs; when empty, the request's own protocol + host is used.
  get publicApiUrl() {
    return (process.env.PUBLIC_API_URL || '').replace(/\/+$/, '');
  },
  cloudinaryUrl: process.env.CLOUDINARY_URL || '',
  uploadDir: process.env.UPLOAD_DIR || '',
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'no-reply@side-myproject.local',
  },
};
