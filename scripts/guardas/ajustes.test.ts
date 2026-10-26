import { accessSync, constants, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// `.claude/settings.json` es lo que el motor de permisos de Claude Code lee: ahí no se puede correr Vitest, así que se prueba que
// cada regla de la lista esté escrita y que cada hook esté cableado a un archivo que existe y se puede ejecutar. La prueba
// funcional de lo que bloquea es la del hook (`bloquear-peligrosos.test.ts`). Las reglas `deny` valen en todo modo de permisos.
const RAIZ = process.cwd()

type Hook = { type: string; command: string }
type Ajustes = {
  permissions: { allow: string[]; deny: string[] }
  hooks: Record<string, { matcher?: string; hooks: Hook[] }[]>
}
const ajustes = JSON.parse(readFileSync(join(RAIZ, '.claude/settings.json'), 'utf8')) as Ajustes

// Lo que ninguna sesión corre sola (lo irreversible, lo remoto y las dependencias); el hook de Bash lo repite con más matices.
const DENEGADAS = [
  'git commit --no-verify*',
  'git commit -n *',
  'git push --force*',
  'git push -f*',
  'git reset --hard*',
  'git clean*',
  'git checkout -- *',
  'git checkout .*',
  'git branch -D*',
  'gh workflow run*',
  'vercel*',
  'npx vercel*',
  'supabase link*',
  'npx supabase link*',
  'supabase secrets*',
  'npx supabase secrets*',
  'npx supabase db push*',
  'pnpm add*',
  'pnpm up*',
  'npx next upgrade*',
  'pnpm next upgrade*',
  'pnpm exec next upgrade*',
]

describe('.claude/settings.json › permisos', () => {
  it.each(DENEGADAS)('deniega Bash(%s)', (regla) => {
    expect(ajustes.permissions.deny).toContain(`Bash(${regla})`)
  })

  it('sigue leyendo sin permiso los .env', () => {
    for (const env of ['.env', '.env.local', '.env.*.local']) {
      expect(ajustes.permissions.deny).toContain(`Read(${env})`)
    }
  })

  it('ninguna regla de deny está también en allow', () => {
    for (const regla of ajustes.permissions.deny)
      expect(ajustes.permissions.allow).not.toContain(regla)
  })
})

// El comando de un hook es `${CLAUDE_PROJECT_DIR}/<ruta>`: la ruta tiene que existir y ser ejecutable.
const rutaDe = (hook: Hook) => hook.command.replace('${CLAUDE_PROJECT_DIR}/', '')

describe('.claude/settings.json › hooks', () => {
  const todos = Object.entries(ajustes.hooks).flatMap(([evento, grupos]) =>
    grupos.flatMap((g) => g.hooks.map((h) => ({ evento, matcher: g.matcher ?? '', hook: h }))),
  )

  it.each(todos.map((t) => [t.evento, t.matcher, rutaDe(t.hook)] as const))(
    '%s %s → %s existe y se puede ejecutar',
    (_evento, _matcher, ruta) => {
      expect(() => accessSync(join(RAIZ, ruta), constants.X_OK)).not.toThrow()
    },
  )

  const cableado = (evento: string, matcher: string, ruta: string) =>
    todos.some((t) => t.evento === evento && t.matcher === matcher && rutaDe(t.hook) === ruta)

  it('Bash pasa por bloquear-peligrosos.sh antes de correr', () => {
    expect(cableado('PreToolUse', 'Bash', '.claude/hooks/bloquear-peligrosos.sh')).toBe(true)
  })

  it('un archivo editado se lintea y al terminar se verifica', () => {
    expect(cableado('PostToolUse', 'Edit|Write', '.claude/hooks/lint-archivo.sh')).toBe(true)
    expect(cableado('Stop', '', '.claude/hooks/verificar-al-terminar.sh')).toBe(true)
  })
})

// Todo lo que usa la base local o el servidor de e2e pasa por `scripts/candado.sh` (una sesión a la vez, en cualquier worktree).
// `db:base` y `db:probar` no: corren en PGlite, en memoria, sin base ni puerto compartidos (y lefthook corre `probar-schema` al
// commitear SQL: bloquearlo frenaría los commits de otra sesión durante un e2e).
const scripts = (
  JSON.parse(readFileSync(join(RAIZ, 'package.json'), 'utf8')) as {
    scripts: Record<string, string>
  }
).scripts
const CON_CANDADO = [
  'db:reset',
  'db:types',
  'db:diff',
  'db:medir',
  'db:carreras',
  'db:lint',
  'db:sembrar-volumen',
  'db:medir:volumen',
  'test:e2e',
  'test:e2e:completo',
]

describe('package.json › el candado de la base', () => {
  it.each(CON_CANDADO)('%s toma el candado con su propio nombre', (nombre) => {
    expect(scripts[nombre]).toContain(`bash scripts/candado.sh ${nombre} -- `)
  })

  it.each(['db:base', 'db:probar'])('%s no lo toma: es PGlite en memoria', (nombre) => {
    expect(scripts[nombre]).not.toContain('candado.sh')
  })

  it('test:e2e construye fuera del candado y le deja a playwright los argumentos', () => {
    expect(scripts['test:e2e']).toMatch(/next build && .*candado\.sh test:e2e -- playwright test$/)
  })
})
