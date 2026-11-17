import os from 'os';
import path from 'path';
import { defineConfig } from 'vitest/config';

// npm run test:pg -> integration suite against a real (embedded) PostgreSQL.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests-pg/**/*.pg.test.js'],
    globalSetup: ['tests-pg/globalSetup.js'],
    testTimeout: 60000,
    hookTimeout: 180000,
    fileParallelism: false,
    pool: 'forks',
    env: {
      NODE_ENV: 'test',
      JWT_SECRET: 'test-secret',
      // Placeholder only: suites point the app at the embedded DB via __setPool().
      DATABASE_URL: 'postgres://invalid:invalid@127.0.0.1:1/never_used',
      CLOUDINARY_URL: '',
      SMTP_HOST: '',
      PUBLIC_API_URL: '',
      UPLOAD_DIR: path.join(os.tmpdir(), 'side-myproject-test-pg-uploads'),
    },
  },
});
