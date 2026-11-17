import pino from 'pino';
import { Writable } from 'stream';
import { config } from '../config/env.js';

// Anything matching these paths is replaced with "[Redacted]" before it is written.
export const REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'headers.authorization',
  'authorization',
  'password',
  'password_hash',
  'newPassword',
  'currentPassword',
  'token',
  'resetToken',
  '*.authorization',
  '*.password',
  '*.password_hash',
  '*.newPassword',
  '*.currentPassword',
  '*.token',
  '*.resetToken',
];

export const loggerOptions = {
  level: config.logLevel,
  redact: { paths: REDACT_PATHS, censor: '[Redacted]' },
  base: { service: 'side-myproject-api' },
};

/**
 * In tests every log line is captured in memory (fully serialized, after redaction) so
 * tests can assert that secrets never reach the log output.
 */
export const testLogLines = [];
const testSink = new Writable({
  write(chunk, enc, cb) {
    testLogLines.push(chunk.toString());
    cb();
  },
});

const logger = config.isTest
  ? pino({ ...loggerOptions, level: process.env.LOG_LEVEL || 'trace' }, testSink)
  : pino(loggerOptions);

export default logger;
