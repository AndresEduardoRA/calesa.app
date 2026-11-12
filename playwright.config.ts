import { defineConfig, devices } from '@playwright/test'
import { CLAVE_PUBLICA_DE_PRUEBA } from './e2e/soporte/push'
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
  // En CI, un reintento: una prueba inestable no pone el PR en rojo (cada rojo lo devolvía a su carril: 13 corridas del 3 al 7-11 sin código
  // roto), pero el reporter de inestables la anota en el PR. En local, ninguno: la causa se busca (`.claude/rules/e2e.md`).
  retries: process.env['CI'] ? 1 : 0,
  workers: 1,
  // El último guarda los artefactos de toda corrida que falla (`e2e/soporte/reporter-de-fallos.ts`).
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    ['./e2e/soporte/reporter-de-inestables.ts'],
    ['./e2e/soporte/reporter-de-fallos.ts'],
  ],
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
    // La clave pública de los avisos push (no es un secreto): sin ella el perfil dice «sin clave». La del entorno gana.
    env: {
      ...(process.env as Record<string, string>),
      NEXT_PUBLIC_VAPID_PUBLIC_KEY:
        process.env['NEXT_PUBLIC_VAPID_PUBLIC_KEY'] ?? CLAVE_PUBLICA_DE_PRUEBA,
    },
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
