import { execFileSync, spawnSync } from 'node:child_process'
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'

// La máquina dedicada: comprobar el entorno, instalar los servicios `systemd --user` de cada carril y respaldar el estado del piloto.
const SCRIPTS = resolve('scripts/maquina')
const raices: string[] = []
let raiz = ''
let repo = ''

const ejecutar = (
  script: string,
  args: string[] = [],
  env: Record<string, string> = {},
  path?: string,
) => {
  const r = spawnSync('bash', [join(SCRIPTS, script), ...args], {
    cwd: repo,
    encoding: 'utf8',
    env: { HOME: raiz, PATH: path ?? process.env['PATH'] ?? '', NODE_ENV: 'test', ...env },
  })
  return { estado: r.status, salida: r.stdout + r.stderr }
}

beforeEach(() => {
  raiz = mkdtempSync(join(tmpdir(), 'maquina-'))
  raices.push(raiz)
  repo = join(raiz, 'repo')
  execFileSync('git', ['init', '-q', '-b', 'main', repo])
})
afterAll(() => {
  for (const r of raices) rmSync(r, { recursive: true, force: true })
})

describe('respaldar.sh', () => {
  it('guarda .piloto y la carpeta común sin secretos, y conserva sólo los últimos N', () => {
    mkdirSync(join(repo, '.piloto'))
    writeFileSync(join(repo, '.piloto/registro.md'), 'hola\n')
    writeFileSync(join(repo, '.piloto/.env.local'), 'SECRETO=1\n')
    mkdirSync(join(repo, '.git/piloto'), { recursive: true })
    writeFileSync(join(repo, '.git/piloto/compuerta.md'), 'id: g-1\n')
    const destino = join(raiz, 'respaldos')
    for (let i = 0; i < 3; i++) {
      const r = ejecutar('respaldar.sh', [], { RESPALDOS: destino, RESPALDOS_N: '2' })
      expect(r.estado, r.salida).toBe(0)
      execFileSync('sleep', ['1.1'])
    }
    const archivos = readdirSync(destino)
    expect(archivos).toHaveLength(2)
    const contenido = execFileSync('tar', ['-tzf', join(destino, archivos[0] ?? '')], {
      encoding: 'utf8',
    })
    expect(contenido).toContain('registro.md')
    expect(contenido).toContain('compuerta.md')
    expect(contenido).not.toContain('.env.local')
  })

  it('sin estado no falla ni crea nada', () => {
    const destino = join(raiz, 'respaldos')
    const r = ejecutar('respaldar.sh', [], { RESPALDOS: destino })
    expect(r.estado, r.salida).toBe(0)
    expect(r.salida).toContain('no hay estado del piloto')
    expect(readdirSync(destino)).toEqual([])
  })
})

describe('instalar-servicios.sh', () => {
  it('en seco imprime una unidad por carril (el a en la principal, los otros en su worktree) y el timer', () => {
    const r = ejecutar('instalar-servicios.sh', ['--en-seco', 'a', 'b'])
    expect(r.estado, r.salida).toBe(0)
    expect(r.salida).toContain(`WorkingDirectory=${repo}\n`)
    expect(r.salida).toContain(`WorkingDirectory=${repo}.carriles/b`)
    expect(r.salida).toContain('ExecStart=/usr/bin/env bash scripts/piloto/arrancar.sh --carril b')
    expect(r.salida).toContain('OnCalendar=*-*-* 00/6:00:00')
    expect(r.salida).not.toContain('--carril c')
    // El vigía de cada carril: lo levanta si se cayó (FLUJO-1).
    expect(r.salida).toContain('# piloto-b-vigia.timer')
    expect(r.salida).toContain(
      'ExecStart=/usr/bin/env bash scripts/piloto/arrancar.sh --carril b --si-caido',
    )
    expect(r.salida).toContain('OnUnitActiveSec=10min')
  })

  it('con CARRILES_DIR los carriles ≠ a viven ahí (otro disco)', () => {
    const r = ejecutar('instalar-servicios.sh', ['--en-seco', 'a', 'b'], {
      CARRILES_DIR: '/mnt/orca-carriles',
    })
    expect(r.estado, r.salida).toBe(0)
    expect(r.salida).toContain('WorkingDirectory=/mnt/orca-carriles/b')
    expect(r.salida).not.toContain(`${repo}.carriles`)
  })

  it('en seco no escribe ninguna unidad', () => {
    ejecutar('instalar-servicios.sh', ['--en-seco'], { UNIDADES: join(raiz, 'unidades') })
    expect(existsSync(join(raiz, 'unidades'))).toBe(false)
  })
})

describe('verificar-entorno.sh', () => {
  it('con un PATH sin docker, gh ni claude dice qué falta y sale con 1', () => {
    const bin = join(raiz, 'bin')
    mkdirSync(bin)
    for (const p of [
      'bash',
      'git',
      'awk',
      'df',
      'nproc',
      'tr',
      'cut',
      'grep',
      'cat',
      'sed',
      'head',
      'tail',
      'dirname',
      'env',
      'jq',
      'flock',
      'node',
    ]) {
      const ruta = spawnSync('bash', ['-lc', `command -v ${p}`], { encoding: 'utf8' }).stdout.trim()
      if (ruta) symlinkSync(ruta, join(bin, p))
    }
    const r = ejecutar('verificar-entorno.sh', ['1'], {}, bin)
    expect(r.estado, r.salida).toBe(1)
    expect(r.salida).toContain('✓ git')
    expect(r.salida).toContain('✗ falta docker en el PATH')
    expect(r.salida).toContain('✗ falta gh en el PATH')
    expect(r.salida).toContain('cosa(s) por arreglar')
  })
})
