import { execFileSync, spawnSync } from 'node:child_process'
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'

// `verificar.sh` lo corre el bucle (no la sesión) después de un paso «listo»: no le cree al modelo. Lo mínimo y local: typecheck y el
// mapa, y nada si la huella del árbol ya es la de una verificación verde. Lint, la suite, `db:probar` y los e2e son del CI de la rama
// (`ci.sh`), no se repiten aquí. Deja la huella verde sólo si todo pasó. Se prueba con un `pnpm` falso que registra sus argumentos, en
// un repo temporal.
const PIEZAS = ['verificar.sh', 'nivel.mjs', 'huella.sh', 'comun.sh']

let raiz = ''
let repo = ''
let bin = ''
let inicio = ''
const raices: string[] = []

const git = (...args: string[]) =>
  execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@ejemplo.test', ...args], {
    cwd: repo,
    encoding: 'utf8',
  }).trim()

function commitear(archivo: string, texto = 'x\n') {
  mkdirSync(dirname(join(repo, archivo)), { recursive: true })
  writeFileSync(join(repo, archivo), texto)
  git('add', '--', archivo)
  git('commit', '-q', '-m', archivo)
}

beforeEach(() => {
  raiz = mkdtempSync(join(tmpdir(), 'verificar-'))
  raices.push(raiz)
  repo = join(raiz, 'repo')
  bin = join(raiz, 'bin')
  mkdirSync(repo)
  mkdirSync(bin)
  execFileSync('git', ['init', '-q', '-b', 'main', repo])
  for (const pieza of PIEZAS) copyFileSync(resolve('scripts/piloto', pieza), join(bin, pieza))
  // `pnpm` y `bash scripts/mapa.sh` falsos: registran qué se les pidió (y, a `test:e2e`, con qué entorno), y uno falla si se lo piden
  // (con la salida de `FAKE_SALIDA`, si la hay).
  writeFileSync(
    join(bin, 'pnpm'),
    `#!/usr/bin/env bash
echo "pnpm $*" >> "${join(raiz, 'llamadas.txt')}"
[ "$1" = test:e2e ] && echo "E2E_SIN_FUNCIONES=\${E2E_SIN_FUNCIONES:-}" >> "${join(raiz, 'entorno-e2e.txt')}"
[ -n "\${FAKE_FALLA:-}" ] && [[ "$*" == "$FAKE_FALLA"* ]] && { printf '%s\\n' "\${FAKE_SALIDA:-falló $*}"; exit 1; }
exit 0
`,
  )
  chmodSync(join(bin, 'pnpm'), 0o755)
  mkdirSync(join(repo, 'scripts'))
  writeFileSync(
    join(repo, 'scripts/mapa.sh'),
    `echo "mapa $*" >> "${join(raiz, 'llamadas.txt')}"\n`,
  )
  commitear('.gitignore', '.claude/.verificado-stop\n')
  commitear('README.md')
  inicio = git('rev-parse', 'HEAD')
})
afterAll(() => {
  for (const r of raices) rmSync(r, { recursive: true, force: true })
})

function verificar(e2e: string[] = [], extra: Record<string, string> = {}) {
  const ultimo = join(raiz, 'ultimo.json')
  writeFileSync(ultimo, JSON.stringify({ paso: '4.99', resultado: 'listo', e2e_dirigidos: e2e }))
  const r = spawnSync('bash', [join(bin, 'verificar.sh'), inicio, ultimo], {
    cwd: repo,
    encoding: 'utf8',
    env: {
      NODE_ENV: 'test',
      PATH: `${bin}:${process.env['PATH'] ?? ''}`,
      PILOTO_RAIZ: repo,
      PILOTO_COMUN: join(raiz, 'comun'),
      ...extra,
    },
  })
  return { estado: r.status, salida: r.stdout + r.stderr }
}

const llamadas = () =>
  existsSync(join(raiz, 'llamadas.txt'))
    ? readFileSync(join(raiz, 'llamadas.txt'), 'utf8').trim().split('\n')
    : []
const HUELLA = () => join(repo, '.claude/.verificado-stop')

describe('verificar.sh › lo que corre', () => {
  it('typecheck y el mapa, en ese orden, y deja la huella verde', () => {
    commitear('docs/ESTADO.md')
    const r = verificar()
    expect(r.estado, r.salida).toBe(0)
    expect(llamadas()).toEqual(['pnpm typecheck', 'mapa --check'])
    expect(readFileSync(HUELLA(), 'utf8').trim()).toBe(
      execFileSync('bash', [join(bin, 'huella.sh')], { cwd: repo, encoding: 'utf8' }).trim(),
    )
  })

  it('no repite lo del CI: ni lint, ni la suite, ni db:probar, ni e2e (aunque haya supabase/, interfaz y e2e dirigidos)', () => {
    commitear('supabase/migrations/20261020000000_x.sql', 'create index x on leads (id);\n')
    commitear('src/modules/leads/features/tabla/tabla.tsx')
    const r = verificar(['e2e/leads.spec.ts'])
    expect(r.estado, r.salida).toBe(0)
    expect(llamadas()).toEqual(['pnpm typecheck', 'mapa --check'])
  })

  it('con la huella de una verificación verde no corre nada y sale con 0', () => {
    commitear('docs/ESTADO.md')
    execFileSync('bash', [join(bin, 'huella.sh'), '--escribir'], { cwd: repo })
    const r = verificar()
    expect(r.estado, r.salida).toBe(0)
    expect(llamadas()).toEqual([])
    expect(r.salida).toContain('ya está verificado')
  })

  it('si el árbol cambió después de esa huella, verifica', () => {
    commitear('docs/ESTADO.md')
    execFileSync('bash', [join(bin, 'huella.sh'), '--escribir'], { cwd: repo })
    commitear('docs/otro.md')
    expect(verificar().estado).toBe(0)
    expect(llamadas()).toEqual(['pnpm typecheck', 'mapa --check'])
  })
})

describe('verificar.sh › cuando algo falla', () => {
  it('typecheck rojo: sale con 1, lo dice, no deja la huella y no corre el mapa', () => {
    commitear('src/modules/leads/features/tabla/tabla.tsx')
    const r = verificar([], { FAKE_FALLA: 'typecheck' })
    expect(r.estado).toBe(1)
    expect(r.salida).toContain('verificar')
    expect(existsSync(HUELLA())).toBe(false)
    expect(llamadas()).toEqual(['pnpm typecheck'])
  })

  it('el mapa desactualizado es un rojo', () => {
    commitear('docs/ESTADO.md')
    writeFileSync(join(repo, 'scripts/mapa.sh'), 'exit 1\n')
    const r = verificar()
    expect(r.estado).toBe(1)
    expect(existsSync(HUELLA())).toBe(false)
  })

  it('un ultimo.json ilegible no es un verde', () => {
    writeFileSync(join(raiz, 'ultimo.json'), 'no es json')
    const r = spawnSync('bash', [join(bin, 'verificar.sh'), inicio, join(raiz, 'ultimo.json')], {
      cwd: repo,
      encoding: 'utf8',
      env: {
        NODE_ENV: 'test',
        PATH: `${bin}:${process.env['PATH'] ?? ''}`,
        PILOTO_RAIZ: repo,
        PILOTO_COMUN: join(raiz, 'comun'),
      },
    })
    expect(r.status).toBe(1)
  })
})

// El bucle arma el aviso con la última línea de stderr (`cierre.sh`): tiene que ser la causa, no el pie de la herramienta
// («ELIFECYCLE», «To open last HTML report run:»).
describe('verificar.sh › la última línea dice la causa', () => {
  const ESC = '\u001b'
  const PIE = [
    'To open last report run:',
    `${ESC}[36m  pnpm exec algo${ESC}[39m`,
    '[ELIFECYCLE] Command failed with exit code 1.',
  ]
  const ultimaLinea = (salida: string) => salida.trimEnd().split('\n').at(-1)

  function fallar(lineas: string[]) {
    commitear('src/modules/leads/features/tabla/tabla.tsx')
    return verificar([], { FAKE_FALLA: 'typecheck', FAKE_SALIDA: lineas.join('\n') })
  }

  it('la primera línea «Error:» del log, sin colores ni sangría, y no el pie', () => {
    const r = fallar([
      '  ✘  1 src/a.ts:12:5 un título',
      `${ESC}[31m  Error: TS2322 el tipo no cuadra${ESC}[39m`,
      'Error: otra, que no es la primera',
      ...PIE,
    ])
    expect(r.estado).toBe(1)
    expect(ultimaLinea(r.salida)).toBe(
      'verificar: typecheck falló: Error: TS2322 el tipo no cuadra',
    )
  })

  it('sin «Error:», la primera con ✘, FAIL o error', () => {
    const r = fallar(['Corriendo', '  ✘  1 src/a.ts:12:5 un título', ...PIE])
    expect(ultimaLinea(r.salida)).toBe('verificar: typecheck falló: ✘  1 src/a.ts:12:5 un título')
  })

  it('sin ninguna, remite al log completo', () => {
    const r = fallar(['una línea cualquiera', 'To open last report run:'])
    expect(ultimaLinea(r.salida)).toMatch(
      /^verificar: typecheck falló: ver \S+\/verificar-typecheck\.log$/,
    )
  })

  it('una causa larga se corta en 200 caracteres, no en 200 bytes', () => {
    const larga = `Error: ${'ñ'.repeat(300)}`
    const r = fallar([larga, ...PIE])
    expect(ultimaLinea(r.salida)).toBe(`verificar: typecheck falló: ${larga.slice(0, 200)}`)
  })
})
