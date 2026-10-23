import { createRequire } from 'node:module'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import { ReporterDeSalida } from './scripts/reporter-de-salida'
import { CARPETA_DE_SALIDAS, nombreDeCorrida } from './scripts/salida-de-test'

// Cada corrida guarda su salida y su JSON en `test-salidas/<corrida>/` (ignorada por git; quedan las cinco últimas).
// Al fijar `reporters` Vitest ya no elige solo entre `agent` y `default`: se repite su elección (con su `std-env`).
const { isAgent } = createRequire(createRequire(import.meta.url).resolve('vitest/package.json'))(
  'std-env',
) as { isAgent: boolean }
const corrida = nombreDeCorrida(new Date(), process.pid)

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts'],
    // Vitest NO puede testear Server Components async. Esos van a Playwright (e2e/).
    exclude: ['**/node_modules/**', '**/e2e/**', '**/.next*/**'],
    passWithNoTests: true,
    reporters: [
      isAgent ? 'agent' : 'default',
      ['json', { outputFile: `${CARPETA_DE_SALIDAS}/${corrida}/resultado.json` }],
      new ReporterDeSalida(corrida),
    ],
    coverage: { include: ['src/modules/*/entities/**'] },
  },
})
