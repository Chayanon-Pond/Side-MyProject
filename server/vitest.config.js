import os from 'os';
import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
    testTimeout: 20000,
    hookTimeout: 20000,
    // Never let a developer's .env / real DATABASE_URL leak into tests.
    env: {
      NODE_ENV: 'test',
      JWT_SECRET: 'test-secret',
      DATABASE_URL: 'postgres://invalid:invalid@127.0.0.1:1/never_used',
      CLOUDINARY_URL: '',
      SMTP_HOST: '',
      UPLOAD_DIR: path.join(os.tmpdir(), 'side-myproject-test-uploads'),
    },
    pool: 'forks',
  },
});
