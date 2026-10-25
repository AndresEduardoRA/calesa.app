import { execFileSync, spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

// `scripts/ci-cambios.sh` decide si CI corre la base y el e2e (job `cambios` de `.github/workflows/ci.yml`). Se prueba contra
// repos de git de verdad, en una carpeta temporal: un commit sólo de docs, uno de código, sin commit de comparación, con uno que
// el clon no tiene y con un clon superficial, que es lo que pasaría sin `fetch-depth: 0`.
const SCRIPT = resolve('scripts/ci-cambios.sh')
const CEROS = '0'.repeat(40)

let raiz = ''
let repo = ''
const commits: Record<string, string> = {}

function git(cwd: string, ...args: string[]): string {
  return execFileSync('git', ['-c', 'user.name=ci', '-c', 'user.email=ci@ejemplo.test', ...args], {
    cwd,
    encoding: 'utf8',
  }).trim()
}

function commitear(nombre: string, archivos: string[]) {
  for (const archivo of archivos) {
    mkdirSync(dirname(join(repo, archivo)), { recursive: true })
    writeFileSync(join(repo, archivo), `${nombre}\n`)
  }
  git(repo, 'add', '--', ...archivos)
  git(repo, 'commit', '-q', '-m', nombre)
  commits[nombre] = git(repo, 'rev-parse', 'HEAD')
}

function correr(cwd: string, entorno: Record<string, string>, hasta: string) {
  const r = spawnSync('bash', [SCRIPT], {
    cwd,
    encoding: 'utf8',
    env: { NODE_ENV: 'test', PATH: process.env['PATH'] ?? '', DESPUES: hasta, ...entorno },
  })
  const salida = Object.fromEntries(
    r.stdout
      .trim()
      .split('\n')
      .map((l) => l.split('=')),
  )
  return { salida, motivo: r.stderr }
}

const decidir = (cwd: string, entorno: Record<string, string>, hasta: string) =>
  correr(cwd, entorno, hasta).salida

beforeAll(() => {
  raiz = mkdtempSync(join(tmpdir(), 'ci-cambios-'))
  repo = join(raiz, 'repo')
  mkdirSync(repo)
  git(repo, 'init', '-q', '-b', 'main')
  commitear('inicio', ['README.md'])
  commitear('docs', ['docs/ESTADO.md', 'docs/package.json'])
  commitear('codigo', ['src/app/page.tsx'])
  commitear('lockfile', ['pnpm-lock.yaml'])
  commitear('workflow', ['.github/workflows/ci.yml'])
})

afterAll(() => {
  rmSync(raiz, { recursive: true, force: true })
})

describe('ci-cambios.sh', () => {
  const push = (desde: string, hasta: string, cwd = repo) =>
    decidir(cwd, { EVENTO: 'push', ANTES: commits[desde] ?? desde }, commits[hasta] ?? hasta)

  it('un push sólo de docs (aunque haya un package.json adentro) no corre lo pesado', () => {
    expect(push('inicio', 'docs')).toEqual({ pesado: 'false', e2e: 'false' })
  })

  it('un push con src/ corre la base y no el e2e', () => {
    expect(push('docs', 'codigo')).toEqual({ pesado: 'true', e2e: 'false' })
  })

  it.each(['lockfile', 'workflow'])('un push con %s también es pesado', (commit) => {
    const antes = commit === 'lockfile' ? 'codigo' : 'lockfile'
    expect(push(antes, commit).pesado).toBe('true')
  })

  it('un PR con código corre todo; uno sólo de docs, nada pesado', () => {
    expect(
      decidir(
        repo,
        { EVENTO: 'pull_request', BASE_PR: commits['docs'] ?? '' },
        commits['codigo'] ?? '',
      ),
    ).toEqual({ pesado: 'true', e2e: 'true' })
    expect(
      decidir(
        repo,
        { EVENTO: 'pull_request', BASE_PR: commits['inicio'] ?? '' },
        commits['docs'] ?? '',
      ),
    ).toEqual({ pesado: 'false', e2e: 'false' })
  })

  it('workflow_dispatch corre todo', () => {
    expect(decidir(repo, { EVENTO: 'workflow_dispatch' }, 'HEAD')).toEqual({
      pesado: 'true',
      e2e: 'true',
    })
  })

  it('sin commit de comparación (rama nueva) o con uno desconocido (push forzado), todo es pesado y dice por qué', () => {
    const conMotivo = (antes: string) =>
      correr(repo, { EVENTO: 'push', ANTES: antes }, commits['docs'] ?? '')
    expect(conMotivo(CEROS)).toEqual({
      salida: { pesado: 'true', e2e: 'false' },
      motivo: expect.stringContaining('sin commit de comparación') as string,
    })
    expect(conMotivo('').motivo).toContain('sin commit de comparación')
    expect(conMotivo('1234567890abcdef1234567890abcdef12345678')).toEqual({
      salida: { pesado: 'true', e2e: 'false' },
      motivo: expect.stringContaining('el clon no tiene 1234567890ab') as string,
    })
  })

  it('mira todo el rango del push, no sólo el último commit', () => {
    commitear('codigo-2', ['src/app/layout.tsx'])
    commitear('docs-3', ['docs/PLAN.md'])
    expect(push('workflow', 'docs-3').pesado).toBe('true')
    expect(push('codigo-2', 'docs-3').pesado).toBe('false')
  })

  it('con un clon superficial el commit anterior no está y todo cae a pesado; con la historia entera, no', () => {
    // Un push sólo de docs encima de lo último; el checkout trae sólo ese commit (como `fetch-depth: 1`) o la historia entera.
    commitear('docs-2', ['docs/BITACORA.md'])
    const superficial = join(raiz, 'superficial')
    git(raiz, 'clone', '-q', '--depth', '1', '--branch', 'main', `file://${repo}`, superficial)
    const completo = join(raiz, 'completo')
    git(raiz, 'clone', '-q', '--branch', 'main', `file://${repo}`, completo)
    const hasta = commits['docs-2'] ?? ''
    expect(
      decidir(superficial, { EVENTO: 'push', ANTES: commits['docs-3'] ?? '' }, hasta).pesado,
    ).toBe('true')
    expect(decidir(completo, { EVENTO: 'push', ANTES: commits['docs-3'] ?? '' }, hasta)).toEqual({
      pesado: 'false',
      e2e: 'false',
    })
  })
})
