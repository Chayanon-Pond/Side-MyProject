import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import pinoHttp from 'pino-http';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config/env.js';
import logger from './lib/logger.js';
import pool from './db/pool.js';
import { errorHandler, notFoundHandler } from './lib/errors.js';
import { getUploadDir } from './lib/storage.js';
import { createRateLimiters } from './middleware/rateLimits.js';
import authRouter from './routes/auth/auth-main.js';
import articlesRouter from './routes/articles/articles-main.js';
import categoriesRouter from './routes/categories/categories-main.js';
import notificationsRouter from './routes/notifications/notifications-main.js';
import commentsRouter from './routes/comments/comments-main.js';
import profileRouter from './routes/profile/profile-main.js';
import discoveryRouter from './routes/discovery/discovery-main.js';
import newsletterRouter from './routes/newsletter/newsletter-main.js';
import uploadsRouter from './routes/uploads/uploads-main.js';
import adminRouter from './routes/admin/admin-main.js';

export function isAllowedOrigin(origin) {
  if (!origin) return true; // same-origin, curl, server-to-server
  if (config.corsOrigins.includes(origin)) return true;
  return config.corsPreviewRegex.test(origin);
}

export function createApp() {
  const app = express();
  const limiters = createRateLimiters();

  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  const corsOptions = {
    // Disallowed origins simply get no CORS headers, so the browser blocks the response.
    origin: (origin, cb) => cb(null, isAllowedOrigin(origin)),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  };
  app.use(cors(corsOptions));
  app.options('*', cors(corsOptions));
  // gzip/deflate for JSON and text responses above 1 KB (Railway does not compress for us).
  app.use(compression({ threshold: 1024 }));

  app.use(pinoHttp({
    logger,
    autoLogging: { ignore: (req) => req.url === '/api/health' || req.url === '/api/ready' },
    customLogLevel: (req, res, err) => (err || res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info'),
    serializers: {
      req: (req) => ({ method: req.method, url: req.url, remoteAddress: req.remoteAddress }),
      res: (res) => ({ statusCode: res.statusCode }),
    },
  }));

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // Locally stored images (legacy files and the UPLOAD_DIR adapter).
  app.use('/uploads', express.static(getUploadDir(), { fallthrough: true, index: false, maxAge: '7d' }));

  // ---- probes (registered before the global limiter so health checks are never throttled) ----
  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
  app.get('/api/ready', async (req, res) => {
    try {
      await pool.query('SELECT 1');
      res.json({ status: 'ok' });
    } catch {
      res.status(503).json({ status: 'error' });
    }
  });

  app.use('/api', limiters.global);
  app.post('/api/auth/login', limiters.auth);
  app.post('/api/auth/register', limiters.auth);
  app.post('/api/auth/forgot-password', limiters.passwordReset);
  app.post('/api/auth/reset-password-token', limiters.passwordReset);
  app.post('/api/comments/article/:articleId', limiters.comments);
  app.get('/api/search', limiters.search);
  app.post('/api/newsletter', limiters.newsletter);

  app.get('/', (req, res) => res.json({ message: 'Side MyProject API Server', status: 'ok' }));

  app.use('/api/auth', authRouter);
  app.use('/api/articles', articlesRouter);
  app.use('/api/categories', categoriesRouter);
  app.use('/api/notifications', notificationsRouter);
  app.use('/api/comments', commentsRouter);
  app.use('/api/profile', profileRouter);
  app.use('/api/newsletter', newsletterRouter);
  app.use('/api/uploads', uploadsRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api', discoveryRouter); // /api/makes, /api/search, /api/compare

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

const app = createApp();
export default app;

// `node app.js` starts the HTTP server (Railway startCommand); importing this module does not.
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const { start } = await import('./server.js');
  start(app);
}
