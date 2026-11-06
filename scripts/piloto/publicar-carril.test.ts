import { execFileSync, spawnSync } from 'node:child_process'
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'

// Con PILOTO_CARRIL, `publicar.sh` publica la rama `<carril>/<paso>` con un PR por paso y le dice al coordinador que el paso quedó
// publicado (con el número del PR). Sin carril, el comportamiento de siempre (publicar.test.ts).
const SCRIPT = resolve('scripts/piloto/publicar.sh')
const raices: string[] = []
let raiz = ''
let repo = ''
let base = ''

const git = (cwd: string, ...args: string[]) =>
  execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@ejemplo.test', ...args], {
    cwd,
    encoding: 'utf8',
  }).trim()

beforeEach(() => {
  raiz = mkdtempSync(join(tmpdir(), 'publicar-carril-'))
  raices.push(raiz)
  repo = join(raiz, 'repo')
  const remoto = join(raiz, 'remoto.git')
  execFileSync('git', ['init', '-q', '--bare', '-b', 'main', remoto])
  execFileSync('git', ['init', '-q', '-b', 'main', repo])
  git(repo, 'remote', 'add', 'origin', remoto)
  writeFileSync(join(repo, 'README.md'), 'x\n')
  git(repo, 'add', '.')
  git(repo, 'commit', '-q', '-m', 'inicio')
  git(repo, 'push', '-q', 'origin', 'main')
  base = git(repo, 'rev-parse', 'HEAD')
  mkdirSync(join(raiz, 'bin'))
  const gh = join(raiz, 'bin/gh')
  // `pr list` no ve el PR hasta que `pr create` lo abre (como GitHub).
  writeFileSync(
    gh,
    `#!/usr/bin/env bash
echo "$*" >> "${raiz}/gh.log"
case "$1 $2" in
  "run list") printf '[]' ;;
  "pr create") touch "${raiz}/pr-abierto" ;;
  "pr list") [ -e "${raiz}/pr-abierto" ] && printf '[{"number":31}]' || printf '[]' ;;
esac
exit 0
`,
  )
  const coord = join(raiz, 'coordinador.mjs')
  writeFileSync(
    coord,
    `import { appendFileSync } from 'node:fs'\nappendFileSync('${raiz}/coord.log', process.argv.slice(2).join(' ') + '\\n')\n`,
  )
  for (const f of [gh]) chmodSync(f, 0o755)
})
afterAll(() => {
  for (const r of raices) rmSync(r, { recursive: true, force: true })
})

function publicar(rama: string, carril = 'formula', paso = '4.20') {
  git(repo, 'checkout', '-q', base)
  git(repo, 'checkout', '-q', '-b', rama)
  writeFileSync(join(repo, 'a.ts'), `${rama}\n`)
  git(repo, 'add', '.')
  git(repo, 'commit', '-q', '-m', 'a')
  const r = spawnSync('bash', [SCRIPT, paso, base], {
    cwd: repo,
    encoding: 'utf8',
    env: {
      NODE_ENV: 'test',
      PATH: `${join(raiz, 'bin')}:${process.env['PATH'] ?? ''}`,
      PILOTO_COMUN: join(raiz, 'comun'),
      PILOTO_RAIZ: repo,
      PILOTO_DIR: join(raiz, 'estado'),
      PILOTO_COORDINADOR: join(raiz, 'coordinador.mjs'),
      PILOTO_CARRIL: carril,
    },
  })
  return { estado: r.status, salida: r.stdout + r.stderr }
}
const leer = (f: string) => {
  try {
    return readFileSync(join(raiz, f), 'utf8')
  } catch {
    return ''
  }
}

describe('publicar.sh › un PR por paso del carril', () => {
  it('abre el PR del paso y el coordinador lo anota como publicado con su número', () => {
    mkdirSync(join(raiz, 'estado'), { recursive: true })
    const r = publicar('formula/4.20')
    expect(r.estado, r.salida).toBe(0)
    expect(leer('gh.log')).toContain(
      'pr create --base main --head formula/4.20 --title Paso 4.20 (carril formula)',
    )
    expect(leer('coord.log')).toContain('publicado 4.20 31')
  })

  it('con «parcial» en ultimo.json, abre el PR pero el paso sigue asignado: el coordinador no lo anota como publicado', () => {
    mkdirSync(join(raiz, 'estado'), { recursive: true })
    writeFileSync(
      join(raiz, 'estado', 'ultimo.json'),
      JSON.stringify({ paso: '4.20', resultado: 'listo', parcial: true }),
    )
    writeFileSync(join(raiz, 'coord.log'), '')
    rmSync(join(raiz, 'pr-abierto'), { force: true })
    const r = publicar('formula/4.20-parcial')
    rmSync(join(raiz, 'estado', 'ultimo.json'), { force: true })
    expect(r.estado, r.salida).toBe(0)
    expect(leer('gh.log')).toContain('--head formula/4.20-parcial')
    expect(leer('coord.log')).not.toContain('publicado 4.20')
    expect(r.salida).toContain('publicado en parte')
  })

  it('la última parte de un paso (4.20-4 del 4.20 asignado) la anota con el id del paso asignado', () => {
    mkdirSync(join(raiz, 'estado'), { recursive: true })
    writeFileSync(
      join(raiz, 'estado', 'asignado.json'),
      JSON.stringify({ accion: 'paso', paso: '4.20', rama: 'formula/4.20' }),
    )
    writeFileSync(join(raiz, 'coord.log'), '')
    rmSync(join(raiz, 'pr-abierto'), { force: true })
    const r = publicar('formula/4.20-final', 'formula', '4.20-4')
    rmSync(join(raiz, 'estado', 'asignado.json'), { force: true })
    expect(r.estado, r.salida).toBe(0)
    expect(leer('coord.log')).toContain('publicado 4.20 31')
    expect(leer('coord.log')).not.toContain('publicado 4.20-4')
  })

  it('se niega a publicar una rama de otro carril, y la a/… tampoco vale con carril', () => {
    expect(publicar('papelera/4.24').estado).toBe(1)
    expect(publicar('a/x').estado).toBe(1)
    expect(leer('coord.log')).toBe('')
  })
})
