import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts'],
    // Vitest NO puede testear Server Components async. Esos van a Playwright (e2e/).
    exclude: ['**/node_modules/**', '**/e2e/**', '**/.next*/**'],
    passWithNoTests: true,
    coverage: { include: ['src/modules/*/entities/**'] },
  },
})
