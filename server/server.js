import path from 'path';
import { fileURLToPath } from 'url';
import { config, assertProductionConfig } from './config/env.js';
import logger from './lib/logger.js';
import { closePool } from './db/pool.js';
import { persistenceWarning, usingCloudinary, getUploadDir } from './lib/storage.js';

let started = false;

/** Boot the HTTP server with fail-fast config checks and graceful shutdown. */
export function start(app) {
  if (started) return null;
  started = true;

  try {
    assertProductionConfig();
  } catch (err) {
    logger.fatal(err.message);
    process.exit(1);
  }

  const warning = persistenceWarning();
  if (warning) logger.warn(warning);
  else logger.info({ storage: usingCloudinary() ? 'cloudinary' : `local:${getUploadDir()}` }, 'Image storage configured');

  const server = app.listen(config.port, () => {
    logger.info({ port: config.port, env: config.env }, 'Server listening');
  });

  let shuttingDown = false;
  const shutdown = (signal, exitCode = 0) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, 'Shutting down');
    const force = setTimeout(() => process.exit(1), 10_000);
    force.unref();
    server.close(async () => {
      try {
        await closePool();
      } catch (err) {
        logger.error({ err: { message: err?.message } }, 'Error closing DB pool');
      }
      process.exit(exitCode);
    });
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('unhandledRejection', (reason) => {
    logger.error({ err: { message: reason?.message || String(reason), stack: reason?.stack } }, 'Unhandled promise rejection');
  });
  process.on('uncaughtException', (err) => {
    logger.fatal({ err: { message: err?.message, stack: err?.stack } }, 'Uncaught exception');
    shutdown('uncaughtException', 1);
  });

  return server;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const { default: app } = await import('./app.js');
  start(app);
}
