/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/**
 * GitHub Pages serves the site from https://bitopiit-dev.github.io/Cricket_Score_Board/,
 * so production builds use that sub-folder as the base. Local development stays at /.
 */
const PAGES_BASE = '/Cricket_Score_Board/';

export default defineConfig(({ command, isPreview }) => ({
  // `vite preview` serves the built files, so it needs the same base.
  base: command === 'build' || isPreview ? PAGES_BASE : '/',
  plugins: [react(), tailwindcss()],
  server: { host: true },
  test: {
    environment: 'node',
    // Browser tests in e2e/ run with Playwright (npm run test:e2e), not Vitest
    include: ['src/**/*.test.ts'],
  },
}));
