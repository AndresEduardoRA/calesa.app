import { execFileSync, spawnSync } from 'node:child_process'
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'

// `arrancar.sh` copia `scripts/piloto/` (sin pruebas) a `<común>/piloto/bin/` con su `bin.sha256` y lanza ESA copia en tmux: es lo que
// impide que un paso cambie el código con que se lo verifica y publica. Se prueba con un `tmux` y un `claude` falsos y un repo temporal
// que lleva la carpeta `scripts/piloto/` real: lo que importa es la copia, su firma, y qué se lanza.
const SCRIPT = resolve('scripts/piloto/arrancar.sh')

let raiz = ''
let repo = ''
let comun = ''
const raices: string[] = []

beforeEach(() => {
  raiz = mkdtempSync(join(tmpdir(), 'arrancar-'))
  raices.push(raiz)
  repo = join(raiz, 'repo')
  mkdirSync(repo)
  execFileSync('git', ['init', '-q', '-b', 'main', repo])
  execFileSync('cp', ['-r', resolve('scripts/piloto'), join(repo, 'scripts-piloto-copia')])
  mkdirSync(join(repo, 'scripts'))
  execFileSync('mv', [join(repo, 'scripts-piloto-copia'), join(repo, 'scripts/piloto')])
  comun = join(repo, '.git/piloto')
  mkdirSync(join(raiz, 'bin'))
  for (const [nombre, texto] of [
    [
      'tmux',
      `#!/usr/bin/env bash\necho "$*" >> "${join(raiz, 'tmux.txt')}"\n[ "$1" = has-session ] && exit 1\nexit 0\n`,
    ],
    ['claude', '#!/usr/bin/env bash\nexit 0\n'],
    ['gh', '#!/usr/bin/env bash\nexit 0\n'],
  ] as const) {
    writeFileSync(join(raiz, 'bin', nombre), texto)
    chmodSync(join(raiz, 'bin', nombre), 0o755)
  }
})
afterAll(() => {
  for (const r of raices) {
    execFileSync('chmod', ['-R', 'u+w', r])
    rmSync(r, { recursive: true, force: true })
  }
})

function arrancar(...args: string[]) {
  return spawnSync('bash', [SCRIPT, ...args], {
    cwd: repo,
    encoding: 'utf8',
    env: {
      NODE_ENV: 'test',
      HOME: raiz,
      PATH: `${join(raiz, 'bin')}:${process.env['PATH'] ?? ''}`,
      PILOTO_RAIZ: repo,
      CLAUDE_BIN: join(raiz, 'bin/claude'),
    },
  })
}
const tmux = () =>
  existsSync(join(raiz, 'tmux.txt')) ? readFileSync(join(raiz, 'tmux.txt'), 'utf8') : ''
const copia = () => readdirSync(join(comun, 'bin')).sort()

describe('arrancar.sh › la copia', () => {
  it('copia las piezas del bucle y ninguna prueba, y anota un sha256 por archivo', () => {
    const r = arrancar()
    expect(r.status, r.stderr).toBe(0)
    const archivos = copia()
    for (const pieza of [
      'bucle.sh',
      'compuerta.sh',
      'cierre.sh',
      'comun.sh',
      'hechos.sh',
      'verificar.sh',
      'publicar.sh',
      'decidir.sh',
      'decidir.settings.json',
      'anotar-decision.sh',
      'consumo.sh',
      'huella.sh',
      'nivel.mjs',
      'cuenta-e2e.mjs',
      'saltadas.mjs',
      'ruteo.schema.json',
      'ultimo.schema.json',
      'bin.sha256',
    ]) {
      expect(archivos, pieza).toContain(pieza)
    }
    expect(archivos.filter((a) => a.endsWith('.ts'))).toEqual([])
    const firmas = readFileSync(join(comun, 'bin/bin.sha256'), 'utf8').trim().split('\n')
    expect(firmas).toHaveLength(archivos.length - 1)
    expect(() =>
      execFileSync('sha256sum', ['-c', '--quiet', 'bin.sha256'], { cwd: join(comun, 'bin') }),
    ).not.toThrow()
  })

  it('la copia queda de sólo lectura', () => {
    arrancar()
    for (const archivo of copia())
      expect(statSync(join(comun, 'bin', archivo)).mode & 0o222, archivo).toBe(0)
  })

  it('volver a arrancar reemplaza la copia por la versión nueva del árbol', () => {
    arrancar()
    writeFileSync(join(repo, 'scripts/piloto/parar.sh'), '#!/usr/bin/env bash\n# versión nueva\n')
    arrancar()
    expect(readFileSync(join(comun, 'bin/parar.sh'), 'utf8')).toContain('versión nueva')
    expect(() =>
      execFileSync('sha256sum', ['-c', '--quiet', 'bin.sha256'], { cwd: join(comun, 'bin') }),
    ).not.toThrow()
  })
})

describe('arrancar.sh › lo que lanza', () => {
  it('el bucle de la COPIA en tmux (piloto-bucle) y una sesión de control con Remote Control', () => {
    arrancar('--hasta', '4.15')
    const lineas = tmux()
    expect(lineas).toContain('new-session -d -s piloto-bucle')
    expect(lineas).toContain(`bash '${comun}/bin/bucle.sh' --hasta 4.15`)
    expect(lineas).not.toContain(`${repo}/scripts/piloto/bucle.sh`)
    expect(lineas).toContain('new-session -d -s piloto-control')
    expect(lineas).toContain("--remote-control 'piloto · control'")
    expect(lineas).toContain('PILOTO_SESION=control')
    expect(lineas).toContain("'/piloto-control'")
  })

  it('no lanza el bucle si ya hay una sesión piloto-bucle', () => {
    writeFileSync(
      join(raiz, 'bin/tmux'),
      `#!/usr/bin/env bash\necho "$*" >> "${join(raiz, 'tmux.txt')}"\nexit 0\n`,
    )
    const r = arrancar()
    expect(r.status).toBe(1)
    expect(r.stderr).toContain('piloto-bucle')
    expect(tmux()).not.toContain('new-session')
  })

  it('sin el binario de claude no arranca', () => {
    mkdirSync(join(raiz, 'sin-claude'))
    for (const nombre of ['tmux', 'gh']) {
      writeFileSync(join(raiz, 'sin-claude', nombre), readFileSync(join(raiz, 'bin', nombre)))
      chmodSync(join(raiz, 'sin-claude', nombre), 0o755)
    }
    const r = spawnSync('bash', [SCRIPT], {
      cwd: repo,
      encoding: 'utf8',
      env: {
        NODE_ENV: 'test',
        HOME: raiz,
        PATH: `${join(raiz, 'sin-claude')}:${process.env['PATH'] ?? ''}`,
        PILOTO_RAIZ: repo,
        CLAUDE_BIN: '',
      },
    })
    expect(r.status).toBe(1)
    expect(r.stderr).toContain('claude')
  })
})
