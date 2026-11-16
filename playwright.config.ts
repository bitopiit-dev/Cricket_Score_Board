import { defineConfig, devices } from '@playwright/test';

/**
 * Browser tests against the production build (`npm run build` first).
 * The build is made without Supabase keys, so the app runs in its offline
 * mode and the tests never depend on the network or live data.
 */
const executablePath = process.env.PW_CHROMIUM_PATH; // only for sandboxes with a preinstalled browser

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // Accessibility scans are CPU-heavy; two at a time keeps them well inside the timeout
  workers: process.env.CI ? 2 : undefined,
  timeout: 60_000,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173/Cricket_Score_Board/',
    locale: 'bn-BD',
    timezoneId: 'Asia/Dhaka',
    trace: 'retain-on-failure',
    launchOptions: executablePath ? { executablePath } : {},
  },
  projects: [
    { name: 'phone', use: { ...devices['Pixel 7'] } },
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },
  ],
  webServer: {
    command: 'npx vite preview --port 4173 --strictPort --host 127.0.0.1',
    url: 'http://127.0.0.1:4173/Cricket_Score_Board/',
    reuseExistingServer: !process.env.CI,
  },
});
