import { execFileSync, spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

// `escribir-solo-en-piloto.sh` es el hook PreToolUse de Write y Edit del planificador: sólo deja escribir bajo `.piloto/planes/` de
// la carpeta de trabajo (la raíz del repo de la sesión), por ruta real: `..` y los enlaces simbólicos no lo engañan.
const HOOK = resolve('.claude/hooks/escribir-solo-en-piloto.sh')

let raiz = ''
let afuera = ''

function correr(herramienta: string, entrada: Record<string, string>, cwd = raiz) {
  const r = spawnSync('bash', [HOOK], {
    input: JSON.stringify({ tool_name: herramienta, tool_input: entrada, cwd }),
    encoding: 'utf8',
  })
  return { estado: r.status, motivo: r.stderr }
}

beforeAll(() => {
  raiz = realpathSync(mkdtempSync(join(tmpdir(), 'escribir-piloto-')))
  afuera = realpathSync(mkdtempSync(join(tmpdir(), 'escribir-afuera-')))
  execFileSync('git', ['init', '-q', '-b', 'main'], { cwd: raiz })
  mkdirSync(join(raiz, '.piloto/planes'), { recursive: true })
  mkdirSync(join(raiz, 'src'), { recursive: true })
  writeFileSync(join(afuera, 'secreto.md'), 'x')
  symlinkSync(afuera, join(raiz, '.piloto/planes/enlace'))
  symlinkSync(join(raiz, 'src'), join(raiz, '.piloto/planes/a-src'))
})

afterAll(() => {
  rmSync(raiz, { recursive: true, force: true })
  rmSync(afuera, { recursive: true, force: true })
})

describe('escribir-solo-en-piloto.sh', () => {
  it.each(['Write', 'Edit'])('%s: deja escribir un plan bajo .piloto/planes/', (herramienta) => {
    expect(correr(herramienta, { file_path: join(raiz, '.piloto/planes/4.13-3b.md') }).estado).toBe(
      0,
    )
    expect(
      correr(herramienta, { file_path: join(raiz, '.piloto/planes/sub/otro.md') }).estado,
    ).toBe(0)
  })

  it('una ruta relativa se lee contra la carpeta de trabajo', () => {
    expect(correr('Write', { file_path: '.piloto/planes/x.md' }).estado).toBe(0)
    expect(correr('Write', { file_path: 'src/x.ts' }).estado).toBe(2)
  })

  it.each([
    'src/shared/x.ts',
    'docs/ESTADO.md',
    '.claude/settings.json',
    '.piloto/informes/x.md',
    '.piloto/decision.md',
    '.piloto/planes',
    '.piloto/planes-otro/x.md',
    '.piloto/planes/../informes/x.md',
    '.piloto/planes/../../src/x.ts',
    '.piloto/planes/enlace/secreto.md',
    '.piloto/planes/a-src/x.ts',
  ])('rechaza escribir %s', (ruta) => {
    const { estado, motivo } = correr('Edit', { file_path: join(raiz, ruta) })
    expect({ estado, motivo: motivo.trim().length > 0 }).toEqual({ estado: 2, motivo: true })
  })

  it('rechaza una ruta de afuera del repo, aunque se llame igual', () => {
    expect(correr('Write', { file_path: join(afuera, '.piloto/planes/x.md') }).estado).toBe(2)
    expect(correr('Write', { file_path: '/tmp/.piloto/planes/x.md' }).estado).toBe(2)
  })

  it('un worktree dentro de la sesión no cambia la raíz: manda el cwd de la entrada', () => {
    expect(correr('Write', { file_path: join(raiz, '.piloto/planes/x.md') }, afuera).estado).toBe(2)
  })

  it('un cuaderno se trata como un archivo más', () => {
    expect(correr('NotebookEdit', { notebook_path: join(raiz, 'src/x.ipynb') }).estado).toBe(2)
    expect(
      correr('NotebookEdit', { notebook_path: join(raiz, '.piloto/planes/x.ipynb') }).estado,
    ).toBe(0)
  })

  it('sin ruta no hay nada que escribir', () => {
    expect(correr('Write', {}).estado).toBe(2)
  })
})
