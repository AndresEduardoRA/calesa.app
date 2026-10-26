import { execFileSync, spawn, spawnSync } from 'node:child_process'
import { chmodSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'

// `hechos.sh` junta sin modelo lo que el ruteo y el paso necesitarían un comando para saber (el ruteo no tiene Bash): rama, HEAD,
// disco, el candado, el CI, la cuenta de e2e, los bytes de ESTADO, el último resultado, el paso en curso, las fallas seguidas, la
// nota del ensayo en seco y la decisión vigente (sólo la de la compuerta de ahora). Se prueba en un repo temporal con un `gh` falso.
const SCRIPT = resolve('scripts/piloto/hechos.sh')

let raiz = ''
let repo = ''
let comun = ''
const raices: string[] = []

const git = (...args: string[]) =>
  execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@ejemplo.test', ...args], {
    cwd: repo,
    encoding: 'utf8',
  }).trim()

beforeEach(() => {
  raiz = mkdtempSync(join(tmpdir(), 'hechos-'))
  raices.push(raiz)
  repo = join(raiz, 'repo')
  comun = join(raiz, 'comun')
  mkdirSync(join(repo, 'docs'), { recursive: true })
  mkdirSync(join(repo, '.piloto'), { recursive: true })
  mkdirSync(join(raiz, 'bin'))
  mkdirSync(comun)
  execFileSync('git', ['init', '-q', '-b', 'main', repo])
  writeFileSync(join(repo, '.gitignore'), '.piloto/\n')
  writeFileSync(join(repo, 'docs/ESTADO.md'), '12345678')
  writeFileSync(
    join(repo, 'docs/BITACORA.md'),
    '# B\ne2e completo: no (4.12-1, pantalla, 1 de 3)\n',
  )
  git('add', '.')
  git('commit', '-q', '-m', 'inicio')
  writeFileSync(
    join(raiz, 'bin/gh'),
    '#!/usr/bin/env bash\nprintf \'%s\' \'[{"databaseId":7,"status":"completed","conclusion":"success","headSha":"abc","displayTitle":"x"}]\'\n',
  )
  chmodSync(join(raiz, 'bin/gh'), 0o755)
})
afterAll(() => {
  for (const r of raices) rmSync(r, { recursive: true, force: true })
})

function hechos() {
  const r = spawnSync('bash', [SCRIPT], {
    cwd: repo,
    encoding: 'utf8',
    env: {
      NODE_ENV: 'test',
      PATH: `${join(raiz, 'bin')}:${process.env['PATH'] ?? ''}`,
      PILOTO_RAIZ: repo,
      PILOTO_COMUN: comun,
      CANDADO_DIR: join(raiz, 'candado'),
    },
  })
  expect(r.status, r.stderr).toBe(0)
  return JSON.parse(r.stdout) as Record<string, unknown>
}

describe('hechos.sh', () => {
  it('rama, HEAD, árbol, disco, ESTADO, CI y la cuenta de e2e', () => {
    const h = hechos()
    expect(h['hora']).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}-04:00$/)
    expect(h).toMatchObject({
      rama: 'main',
      head: git('rev-parse', 'HEAD'),
      origin_main: null,
      arbol_limpio: true,
      bytes_estado: 8,
      fallas_seguidas: 0,
      ultimo: null,
      en_curso: null,
      nota: null,
      decision: null,
      candado: { libre: true, dueno: null },
    })
    expect(h['disco_pct']).toBeGreaterThan(0)
    expect(h['ci']).toMatchObject({ status: 'completed', conclusion: 'success' })
    expect(h['e2e']).toMatchObject({ n: 1, de: 3, el_siguiente_corre_completo: false })
  })

  it('un árbol con un cambio no está limpio, y una rama que no es main se dice', () => {
    writeFileSync(join(repo, 'docs/ESTADO.md'), 'otro')
    git('checkout', '-q', '-b', 'otra')
    expect(hechos()).toMatchObject({ rama: 'otra', arbol_limpio: false })
  })

  it('lee ultimo, en-curso, fallas y la nota del ensayo de .piloto/', () => {
    writeFileSync(
      join(repo, '.piloto/ultimo.json'),
      JSON.stringify({ paso: '4.13-3a', resultado: 'listo' }),
    )
    writeFileSync(
      join(repo, '.piloto/en-curso.json'),
      JSON.stringify({ paso: '4.13-3b', session_id: 's-1', pid: 1 }),
    )
    writeFileSync(join(repo, '.piloto/fallas'), '2\n')
    writeFileSync(join(repo, '.piloto/nota-en-seco.md'), 'el 3a está en curso')
    expect(hechos()).toMatchObject({
      ultimo: { paso: '4.13-3a' },
      en_curso: { paso: '4.13-3b', session_id: 's-1' },
      fallas_seguidas: 2,
      nota: 'el 3a está en curso',
    })
  })

  it('un ultimo.json que no es JSON se informa como null, no rompe', () => {
    writeFileSync(join(repo, '.piloto/ultimo.json'), '{ roto')
    expect(hechos()['ultimo']).toBeNull()
  })

  it('la decisión vigente es la de la compuerta de ahora, no la de otra', () => {
    writeFileSync(join(comun, 'compuerta.md'), 'id: g-2\ntipo: datos\n')
    writeFileSync(join(comun, 'decision.md'), 'id: g-1\nopcion: aprobar\nme respondió: «aprobar»\n')
    expect(hechos()['decision']).toBeNull()
    writeFileSync(join(comun, 'decision.md'), 'id: g-2\nopcion: aprobar\nme respondió: «aprobar»\n')
    expect(hechos()['decision']).toContain('me respondió: «aprobar»')
  })

  it('dice quién tiene el candado de la base cuando está ocupado', async () => {
    const candado = join(raiz, 'candado')
    const dueno = spawn('bash', [resolve('scripts/candado.sh'), 'db:reset', '--', 'cat'], {
      env: { NODE_ENV: 'test', PATH: process.env['PATH'] ?? '', CANDADO_DIR: candado },
      stdio: ['pipe', 'ignore', 'ignore'],
    })
    for (let i = 0; i < 200 && !existsSync(join(candado, 'candado-base.info')); i++) {
      await new Promise((r) => setTimeout(r, 25))
    }
    try {
      const h = hechos()
      expect(h['candado']).toMatchObject({ libre: false })
      expect(JSON.stringify(h['candado'])).toContain('db:reset')
    } finally {
      dueno.stdin.end()
    }
  })
})
