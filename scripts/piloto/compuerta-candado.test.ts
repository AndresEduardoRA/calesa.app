import { spawn, spawnSync, type ChildProcess } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

// Una compuerta humana espera la respuesta con el candado común tomado (`compuerta.md` y `decision.md` comunes son los de la sesión de
// decidir). Las que se contestan solas no pasan por el celular: si esperaran ese candado, una humana sin contestar frenaría a todos los
// carriles (2026-11-06: B esperó 1,5 h su compuerta «afuera» y C y A quedaron detrás con su «guardas» y su «datos»).
const COMPUERTA = resolve('scripts/piloto/compuerta.sh')

let raiz = ''
let comun = ''
let estado = ''
const hijos: ChildProcess[] = []

beforeEach(() => {
  raiz = mkdtempSync(join(tmpdir(), 'compuerta-candado-'))
  comun = join(raiz, 'comun')
  estado = join(raiz, '.piloto')
  mkdirSync(comun)
  mkdirSync(estado)
})
afterEach(() => {
  for (const h of hijos.splice(0)) h.kill()
  rmSync(raiz, { recursive: true, force: true })
})

/** Otro carril con una compuerta humana abierta: tiene el candado común tomado. */
function candadoTomado() {
  const h = spawn('flock', [join(comun, 'compuerta.lock'), 'sleep', '60'], { stdio: 'ignore' })
  hijos.push(h)
  spawnSync('bash', [
    '-c',
    'for i in $(seq 1 100); do flock -n "$1" true || exit 0; sleep 0.05; done; exit 1',
    '_',
    join(comun, 'compuerta.lock'),
  ])
}

function compuerta(tipo: string, segundos: number, extra: Record<string, string> = {}) {
  return spawnSync(
    'timeout',
    [
      String(segundos),
      'bash',
      '-c',
      `source "${COMPUERTA}"; registro() { :; }; ahora_lapaz() { date +%FT%T; }; compuerta "$@"`,
      '_',
      tipo,
      '4.99',
      'el motivo',
      'la pregunta',
    ],
    {
      encoding: 'utf8',
      env: {
        NODE_ENV: 'test',
        PATH: process.env['PATH'] ?? '',
        COMUN: comun,
        ESTADO: estado,
        BIN: join(raiz, 'bin-que-no-existe'),
        POLL: '1',
        PILOTO_CARRIL: 'c',
        ...extra,
      },
    },
  )
}

describe('compuerta.sh › el candado común es sólo de las compuertas humanas', () => {
  it('una compuerta que se contesta sola no espera el candado de otro carril y deja su decisión en el carril', () => {
    candadoTomado()
    const r = compuerta('datos', 10)
    expect(r.status, r.stdout + r.stderr).toBe(0)
    expect(readFileSync(join(estado, 'decision-sola.md'), 'utf8')).toContain('opcion: aprobar')
    expect(readFileSync(join(estado, 'compuerta-sola.md'), 'utf8')).toContain('carril: c')
    // Los archivos comunes son de la compuerta humana del otro carril: no se tocan.
    expect(existsSync(join(comun, 'decision.md'))).toBe(false)
    expect(existsSync(join(comun, 'compuerta.md'))).toBe(false)
  })

  it('una compuerta humana (sin PILOTO_AUTO) sigue esperando el candado común', () => {
    candadoTomado()
    const r = compuerta('afuera', 2, { PILOTO_AUTO: '' })
    expect(r.status).toBe(124)
  })

  it('sin compuertas (lo de omisión, «todo»), una «afuera» se contesta sola y no espera el candado', () => {
    candadoTomado()
    const r = compuerta('afuera', 10)
    expect(r.status, r.stdout + r.stderr).toBe(0)
    expect(readFileSync(join(estado, 'decision-sola.md'), 'utf8')).toContain(
      'opcion: seguir con la recomendación',
    )
  })
})
