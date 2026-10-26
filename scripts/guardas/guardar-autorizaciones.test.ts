import { execFileSync, spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

// `guardar-autorizaciones.sh` (PreToolUse sobre Write, Edit, NotebookEdit y Bash, en settings: corre también dentro de los subagentes)
// guarda lo que autoriza: con `PILOTO_SESION=paso|ruteo` una sesión no escribe en `<común>/piloto/**` ni en `.piloto/decision.md` (por
// ruta real) y ningún Bash las nombra. Sin esa variable, o con `decidir`, no hace nada. Se prueba con repos temporales, también con
// un worktree: el hook calcula la carpeta común con `git`, no con una variable que la sesión pudiera tocar.
const HOOK = resolve('.claude/hooks/guardar-autorizaciones.sh')

let raiz = ''
let repo = ''
let worktree = ''
let comun = ''

function git(cwd: string, ...args: string[]) {
  execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@ejemplo.test', ...args], { cwd })
}

function correr(
  herramienta: string,
  entrada: Record<string, string>,
  sesion: string | null = 'paso',
  cwd = repo,
) {
  const r = spawnSync('bash', [HOOK], {
    input: JSON.stringify({ tool_name: herramienta, tool_input: entrada, cwd }),
    encoding: 'utf8',
    env: {
      NODE_ENV: 'test',
      PATH: process.env['PATH'] ?? '',
      ...(sesion ? { PILOTO_SESION: sesion } : {}),
    },
  })
  return { estado: r.status, motivo: r.stderr }
}
const bash = (command: string, sesion: string | null = 'paso') =>
  correr('Bash', { command }, sesion)
const escribir = (file_path: string, sesion: string | null = 'paso', cwd = repo) =>
  correr('Write', { file_path }, sesion, cwd)

beforeAll(() => {
  raiz = realpathSync(mkdtempSync(join(tmpdir(), 'guardar-')))
  repo = join(raiz, 'repo')
  worktree = join(raiz, 'wt')
  mkdirSync(repo)
  git(repo, 'init', '-q', '-b', 'main')
  writeFileSync(join(repo, 'README.md'), 'x')
  git(repo, 'add', '.')
  git(repo, 'commit', '-q', '-m', 'inicio')
  git(repo, 'worktree', 'add', '-q', worktree)
  comun = join(repo, '.git', 'piloto')
  mkdirSync(comun)
  mkdirSync(join(repo, '.piloto/informes'), { recursive: true })
  symlinkSync(comun, join(repo, '.piloto/enlace-a-comun'))
})
afterAll(() => rmSync(raiz, { recursive: true, force: true }))

describe('guardar-autorizaciones.sh › Write y Edit', () => {
  it.each(['paso', 'ruteo'])(
    '%s: no escribe en la carpeta común, ni en una decisión, ni en un aprobado',
    (sesion) => {
      for (const ruta of [
        'decision.md',
        'compuerta.md',
        'aprobado-4.15',
        'bin/bucle.sh',
        'bin/bin.sha256',
        'nuevo/x',
      ]) {
        const r = escribir(join(comun, ruta), sesion)
        expect({ ruta, estado: r.estado, motivo: r.motivo.length > 0 }).toEqual({
          ruta,
          estado: 2,
          motivo: true,
        })
      }
    },
  )

  it('tampoco .piloto/decision.md, con ruta absoluta o relativa', () => {
    expect(escribir(join(repo, '.piloto/decision.md')).estado).toBe(2)
    expect(escribir('.piloto/decision.md').estado).toBe(2)
  })

  it('compara rutas reales: un enlace o un `..` no lo engañan', () => {
    expect(escribir(join(repo, '.piloto/enlace-a-comun/decision.md')).estado).toBe(2)
    expect(escribir(join(repo, '.piloto/informes/../../.git/piloto/decision.md')).estado).toBe(2)
  })

  it('desde un worktree, la carpeta común sigue siendo la del repo principal', () => {
    expect(escribir(join(comun, 'aprobado-4.15'), 'paso', worktree).estado).toBe(2)
    expect(escribir(join(worktree, '.piloto/decision.md'), 'paso', worktree).estado).toBe(2)
  })

  it('NotebookEdit también', () => {
    expect(correr('NotebookEdit', { notebook_path: join(comun, 'x.ipynb') }).estado).toBe(2)
  })

  it.each([
    '.piloto/informes/4.15.md',
    '.piloto/planes/4.15.md',
    '.piloto/hechos.json',
    'src/shared/x.ts',
    'docs/ESTADO.md',
  ])('lo demás pasa: %s', (ruta) => {
    expect(escribir(join(repo, ruta)).estado).toBe(0)
  })

  it('sin PILOTO_SESION, o con decidir, no hace nada (una sesión de la persona, o la que anota)', () => {
    expect(escribir(join(comun, 'decision.md'), null).estado).toBe(0)
    expect(escribir(join(comun, 'decision.md'), 'decidir').estado).toBe(0)
  })
})

describe('guardar-autorizaciones.sh › Bash', () => {
  it.each([
    () => `cat ${join(comun, 'decision.md')}`,
    () => `echo ok > ${comun}/aprobado-4.15`,
    () => 'echo ok > .git/piloto/aprobado-4.15',
    () => 'git rev-parse --git-common-dir',
    () => 'cat piloto/decision.md',
    () => 'touch piloto/aprobado-4.15',
    () => 'ls piloto/compuerta.md',
    () => 'echo x > .piloto/decision.md',
    () => 'bash -c "echo x > .piloto/decision.md"',
  ])('lo nombra → bloquea (%#)', (comando) => {
    const texto = comando()
    const r = bash(texto)
    expect({ texto, estado: r.estado }).toEqual({ texto, estado: 2 })
  })

  it.each([
    'git status',
    'pnpm test',
    'cat .piloto/hechos.json',
    'ls .piloto/informes',
    'git log --oneline -3',
    'node scripts/piloto/nivel.mjs src/proxy.ts',
  ])('lo demás pasa: %s', (comando) => {
    expect(bash(comando).estado).toBe(0)
  })

  it('sin PILOTO_SESION, o con decidir, pasa aunque lo nombre', () => {
    expect(bash('cat .piloto/decision.md', null).estado).toBe(0)
    expect(bash(`cat ${comun}/decision.md`, 'decidir').estado).toBe(0)
  })

  it('una entrada que no es JSON no rompe la sesión', () => {
    const r = spawnSync('bash', [HOOK], {
      input: 'no es json',
      encoding: 'utf8',
      env: { NODE_ENV: 'test', PATH: process.env['PATH'] ?? '', PILOTO_SESION: 'paso' },
    })
    expect(r.status).toBe(0)
  })
})
