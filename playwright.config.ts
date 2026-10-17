import { defineConfig, devices } from '@playwright/test'

// Corre contra la app COMPILADA (NEXT_DIST_DIR=.next-e2e) y Supabase local (supabase start).
// El e2e completo parte de un `db:reset`: `pnpm test:e2e:completo`. Un spec suelto: `pnpm test:e2e <spec>`.
// Sin reintentos a propósito: un test flaky es un bug, no un número que subir.
const puerto = Number(process.env['E2E_PORT'] ?? 3210)

export default defineConfig({
  testDir: './e2e',
  // El recorrido con volumen (50.000 leads, `pnpm db:sembrar-volumen`) sólo con `E2E_VOLUMEN=1`: no es un salto (el
  // completo los vuelve error), no corre.
  testIgnore: process.env['E2E_VOLUMEN']
    ? []
    : ['**/escala-recorrido.spec.ts', '**/listas-por-pagina-volumen.spec.ts'],
  timeout: 30_000,
  retries: 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  // La guardia: falla en segundos si las funciones edge no están servidas (e2e/soporte/guardia.ts).
  globalSetup: './e2e/global-setup.ts',
  use: {
    baseURL: `http://localhost:${puerto}`,
    // Lo de un fallo queda para diagnosticarlo; `test:e2e:completo` lo copia a `e2e-fallos/` antes de la
    // corrida siguiente, que vacía `test-results/`.
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
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
