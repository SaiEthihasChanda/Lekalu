import { defineConfig, configDefaults } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

// *-real suites talk to the live Firebase project (they create users and data).
// They only run when explicitly requested: RUN_REAL_FIREBASE=1 npm run test:run
const runReal = process.env.RUN_REAL_FIREBASE === '1';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    exclude: runReal ? configDefaults.exclude : [...configDefaults.exclude, '**/*-real.test.js'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
