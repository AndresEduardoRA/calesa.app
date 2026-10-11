import { defineConfig, devices } from '@playwright/test'

// Corre contra la app COMPILADA (NEXT_DIST_DIR=.next-e2e) y Supabase local (supabase start).
// Sin reintentos a propósito: un test flaky es un bug, no un número que subir.
const puerto = Number(process.env['E2E_PORT'] ?? 3210)

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: `http://localhost:${puerto}`,
    trace: 'retain-on-failure',
    locale: 'es-BO',
    timezoneId: 'America/La_Paz',
  },
  projects: [
    { name: 'escritorio', use: { ...devices['Desktop Chrome'] } },
    { name: 'movil', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: process.env['E2E_PROD']
      ? `NEXT_DIST_DIR=.next-e2e pnpm next start -p ${puerto}`
      : `pnpm next dev -p ${puerto}`,
    url: `http://localhost:${puerto}`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
