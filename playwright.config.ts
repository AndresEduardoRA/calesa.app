import { defineConfig, devices } from '@playwright/test'
import { archivosSinCelular, patronesDePruebasSinCelular } from './e2e/soporte/sin-celular'

// Corre contra la app COMPILADA (NEXT_DIST_DIR=.next-e2e) y Supabase local (supabase start).
// El e2e completo parte de un `db:reset`: `pnpm test:e2e:completo`. Un spec suelto: `pnpm test:e2e <spec>`.
// Sin reintentos a propósito: un test flaky es un bug, no un número que subir.
const puerto = Number(process.env['E2E_PORT'] ?? 3210)

// El recorrido con volumen (50.000 leads, `pnpm db:sembrar-volumen`) sólo con `E2E_VOLUMEN=1`: no es un salto (el
// completo los vuelve error), no corre.
const SOLO_CON_VOLUMEN = ['**/escala-recorrido.spec.ts', '**/listas-por-pagina-volumen.spec.ts']

// El estrés de «ítems por página» con una navegación pendiente (5a-15), 20 corridas por modo: sólo con `E2E_ESTRES=1`.
const SOLO_CON_ESTRES = ['**/por-pagina-pendiente-*.spec.ts']
const FUERA = [
  ...(process.env['E2E_VOLUMEN'] ? [] : SOLO_CON_VOLUMEN),
  ...(process.env['E2E_ESTRES'] ? [] : SOLO_CON_ESTRES),
]

export default defineConfig({
  testDir: './e2e',
  testIgnore: FUERA,
  timeout: 30_000,
  retries: 0,
  workers: 1,
  // El último guarda los artefactos de toda corrida que falla (`e2e/soporte/reporter-de-fallos.ts`).
  reporter: [['list'], ['html', { open: 'never' }], ['./e2e/soporte/reporter-de-fallos.ts']],
  // La guardia: falla en segundos si las funciones edge no están servidas (e2e/soporte/guardia.ts).
  globalSetup: './e2e/global-setup.ts',
  use: {
    baseURL: `http://localhost:${puerto}`,
    // Lo de un fallo queda para diagnosticarlo; el reporter de fallos lo copia a `e2e-fallos/` antes de la
    // corrida siguiente, que vacía `test-results/`.
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
    locale: 'es-BO',
    timezoneId: 'America/La_Paz',
  },
  projects: [
    { name: 'escritorio', use: { ...devices['Desktop Chrome'] } },
    {
      name: 'movil',
      use: { ...devices['Pixel 7'] },
      // Todo spec corre en los dos proyectos, salvo lo que se marca en el propio spec con un comentario y su motivo
      // (`// @sin-celular-archivo:` y `// @sin-celular:`; `e2e/soporte/sin-celular.ts`, y la guarda en
      // `scripts/guardas/sin-celular.test.ts`). Un `testIgnore` de proyecto reemplaza al de arriba: lleva también el de volumen y el de estrés.
      testIgnore: [...FUERA, ...archivosSinCelular('./e2e')],
      grepInvert: patronesDePruebasSinCelular('./e2e'),
    },
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
