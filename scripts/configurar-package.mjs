// Escribe los scripts de package.json después del scaffold. Idempotente.
import { readFileSync, writeFileSync } from 'node:fs'
import { execSync } from 'node:child_process'

const ruta = new URL('../package.json', import.meta.url)
const pkg = JSON.parse(readFileSync(ruta, 'utf8'))

pkg.name = 'importadora'
pkg.packageManager = `pnpm@${execSync('pnpm -v').toString().trim()}` // lo leen corepack y CI
pkg.private = true
pkg.engines = { node: '>=24', pnpm: '>=10' }
pkg.scripts = {
  ...pkg.scripts,
  dev: 'next dev',
  build: 'next build',
  start: 'next start',
  lint: 'eslint . --max-warnings 0',
  'lint:fix': 'eslint . --fix',
  format: 'prettier --write .',
  // typegen primero: los tipos globales de rutas (LayoutProps, PageProps) salen de .next/types
  typecheck: 'next typegen && tsc --noEmit',
  test: 'vitest run',
  'test:watch': 'vitest',
  'test:e2e': 'NEXT_DIST_DIR=.next-e2e next build && E2E_PROD=1 playwright test',
  'db:reset': 'supabase db reset',
  'db:types':
    'supabase gen types typescript --local --schema public --schema web > src/shared/types/database.types.ts && prettier --ignore-path .gitignore --write src/shared/types/database.types.ts',
  'db:diff': 'supabase db diff -f',
  // regenera la migración base desde supabase/schemas (lo que aplica `supabase db reset`)
  'db:base': 'node scripts/esquema-base.mjs',
  'db:probar': 'node scripts/probar-schema.mjs supabase',
  'db:lint': 'supabase db lint --fail-on error',
  mapa: 'bash scripts/mapa.sh',
  preinstall: 'npx only-allow pnpm',
}
delete pkg.scripts['lint:next']

writeFileSync(ruta, JSON.stringify(pkg, null, 2) + '\n')
console.log('package.json: scripts configurados')
