import { spawn, spawnSync, type ChildProcess } from 'node:child_process'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

// `scripts/candado.sh <nombre> -- <comando…>` es el turno de la base local y del servidor de e2e, que son de una sola sesión a la vez
// aunque haya varios worktrees. Se prueba siempre con `CANDADO_DIR` temporal: nunca se toca el candado real (el de una sesión que
// corre un e2e de verdad).
const SCRIPT = resolve('scripts/candado.sh')

let dir = ''
const abiertos: ChildProcess[] = []

const entorno = (extra: Record<string, string> = {}): NodeJS.ProcessEnv => ({
  NODE_ENV: 'test',
  PATH: process.env['PATH'] ?? '',
  CANDADO_DIR: dir,
  ...extra,
})

function correr(args: string[], extra: Record<string, string> = {}) {
  return spawnSync('bash', [SCRIPT, ...args], {
    encoding: 'utf8',
    env: entorno(extra),
    timeout: 30_000,
  })
}

/** Toma el candado con un comando que no termina hasta que se cierre su entrada, y espera a que figure como dueño. */
async function tomar(nombre: string, extra: Record<string, string> = {}): Promise<ChildProcess> {
  const dueno = spawn('bash', [SCRIPT, nombre, '--', 'cat'], {
    env: entorno(extra),
    stdio: ['pipe', 'ignore', 'ignore'],
  })
  abiertos.push(dueno)
  for (let i = 0; i < 200 && !existsSync(join(dir, 'candado-base.info')); i++) {
    await new Promise((r) => setTimeout(r, 25))
  }
  return dueno
}

async function soltar(dueno: ChildProcess) {
  const fin = new Promise((r) => dueno.once('exit', r))
  dueno.stdin?.end()
  await fin
}

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), 'candado-'))
})

afterEach(async () => {
  for (const p of abiertos.splice(0)) {
    if (p.exitCode === null && p.signalCode === null) await soltar(p)
    else p.stdin?.end()
  }
})

afterAll(() => {
  rmSync(dir, { recursive: true, force: true })
})

describe('candado.sh', () => {
  it('con el candado libre corre el comando y devuelve su salida y su código', () => {
    const r = correr(['uno', '--', 'sh', '-c', 'echo hecho; exit 3'])
    expect({ estado: r.status, salida: r.stdout.trim() }).toEqual({ estado: 3, salida: 'hecho' })
  })

  it('los argumentos llegan al comando tal cual', () => {
    const r = correr(['uno', '--', 'printf', '%s|', 'a b', '--project=movil'])
    expect(r.stdout).toBe('a b|--project=movil|')
  })

  it('ocupado falla al instante con 75 y dice quién lo tiene: pid, carpeta, comando y hora', async () => {
    const dueno = await tomar('db:reset')
    const inicio = Date.now()
    const r = correr(['otro', '--', 'echo', 'no-debe-correr'])
    expect(Date.now() - inicio).toBeLessThan(5_000)
    expect(r.status).toBe(75)
    expect(r.stdout).not.toContain('no-debe-correr')
    expect(r.stderr).toContain('db:reset')
    expect(r.stderr).toContain(`pid ${dueno.pid}`)
    expect(r.stderr).toContain(process.cwd())
    expect(r.stderr).toContain('cat')
    expect(r.stderr).toMatch(/desde \d{4}-\d{2}-\d{2}/)
  })

  it('queda libre al terminar el dueño, y su registro se borra', async () => {
    const dueno = await tomar('uno')
    await soltar(dueno)
    expect(existsSync(join(dir, 'candado-base.info'))).toBe(false)
    expect(correr(['otro', '--', 'echo', 'ok']).status).toBe(0)
  })

  it('queda libre si el dueño muere de golpe', async () => {
    const dueno = await tomar('uno')
    dueno.kill('SIGKILL')
    dueno.stdin?.end() // el `cat` que quedó huérfano termina con su entrada
    await new Promise((r) => dueno.once('exit', r))
    expect(correr(['otro', '--', 'echo', 'ok']).status).toBe(0)
  })
})

describe('candado.sh › reentrada y espera', () => {
  it('es reentrante:un comando que ya corre con el candado lo vuelve a pedir sin trabarse', () => {
    const r = correr([
      'externo',
      '--',
      'bash',
      SCRIPT,
      'interno',
      '--',
      'bash',
      SCRIPT,
      'mas-interno',
      '--',
      'echo',
      'adentro',
    ])
    expect({ estado: r.status, salida: r.stdout.trim() }).toEqual({ estado: 0, salida: 'adentro' })
  })

  it('el reentrante no engaña a otra sesión: sin la variable, el candado ocupado sigue ocupado', async () => {
    await tomar('uno')
    expect(correr(['otro', '--', 'echo', 'x']).status).toBe(75)
  })

  it('con CANDADO_ESPERA espera a que se libere', async () => {
    const dueno = await tomar('uno')
    // Asíncrono: con `spawnSync` el temporizador que suelta al dueño nunca correría.
    const espera = spawn('bash', [SCRIPT, 'otro', '--', 'echo', 'despues'], {
      env: entorno({ CANDADO_ESPERA: '15' }),
    })
    let salida = ''
    espera.stdout.on('data', (d: Buffer) => (salida += d.toString()))
    const estado = new Promise((r) => espera.once('exit', r))
    await new Promise((r) => setTimeout(r, 1_000))
    dueno.stdin?.end()
    expect({ estado: await estado, salida: salida.trim() }).toEqual({
      estado: 0,
      salida: 'despues',
    })
  })

  it('con CANDADO_ESPERA corta, si no se libera a tiempo, falla con 75', async () => {
    await tomar('uno')
    const r = correr(['otro', '--', 'echo', 'x'], { CANDADO_ESPERA: '1' })
    expect(r.status).toBe(75)
    expect(r.stderr).toContain('uno')
  })

  it('un proceso que el comando deja vivo no retiene el candado', () => {
    const r = correr(['uno', '--', 'sh', '-c', 'sleep 3 >/dev/null 2>&1 & echo ok'])
    expect(r.status).toBe(0)
    expect(correr(['otro', '--', 'echo', 'libre']).stdout.trim()).toBe('libre')
  })

  it('sin `--` o sin comando es un error de uso (64) y no toma el candado', () => {
    expect(correr(['uno']).status).toBe(64)
    expect(correr(['uno', '--']).status).toBe(64)
    expect(correr(['uno', 'echo', 'x']).status).toBe(64)
    expect(correr(['otro', '--', 'echo', 'ok']).status).toBe(0)
  })
})
