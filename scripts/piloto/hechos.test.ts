import { execFileSync, spawn, spawnSync } from 'node:child_process'
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
  // Un `curl` falso: anota la URL y contesta el código de la función que nombra (FAKE_CURL: «apibara=204 storage-gc=404»); 000 si no.
  writeFileSync(
    join(raiz, 'bin/curl'),
    `#!/usr/bin/env bash
url="\${@: -1}"; echo "$url" >> "${join(raiz, 'curl.log')}"; codigo=000
for par in \${FAKE_CURL:-}; do case "$url" in */"\${par%%=*}") codigo="\${par#*=}" ;; esac; done
printf '%s' "$codigo"
`,
  )
  chmodSync(join(raiz, 'bin/curl'), 0o755)
})
afterAll(() => {
  for (const r of raices) rmSync(r, { recursive: true, force: true })
})

function hechos(entorno: Record<string, string> = {}) {
  const r = spawnSync('bash', [SCRIPT], {
    cwd: repo,
    encoding: 'utf8',
    env: {
      NODE_ENV: 'test',
      PATH: `${join(raiz, 'bin')}:${process.env['PATH'] ?? ''}`,
      PILOTO_RAIZ: repo,
      PILOTO_COMUN: comun,
      CANDADO_DIR: join(raiz, 'candado'),
      ...entorno,
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
      cwd: repo,
      env: { NODE_ENV: 'test', PATH: process.env['PATH'] ?? '', CANDADO_DIR: candado },
      stdio: ['pipe', 'ignore', 'ignore'],
    })
    for (let i = 0; i < 200 && !existsSync(join(candado, 'candado-base-54622.info')); i++) {
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

// Las funciones edge que el e2e completo exige (`scripts/e2e-completo.mjs`, `e2e/soporte/guardia.ts`): el bucle no las levanta, así que
// mira antes de un paso de Nivel 2 si están servidas, con la regla de la guardia (`OPTIONS`; servida si responde y no es 404 ni ≥ 500).
describe('hechos.sh › las funciones edge', () => {
  it('dice cuáles responden: un 404, un 500 o sin respuesta no están servidas', () => {
    const h = hechos({ FAKE_CURL: 'apibara=204 storage-gc=404 avatares-miniaturas=503' })
    expect(h['funciones']).toEqual({
      apibara: true,
      'storage-gc': false,
      'avatares-miniaturas': false,
    })
    expect(hechos({ FAKE_CURL: 'apibara=200' })['funciones']).toMatchObject({ 'storage-gc': false })
  })

  it('pregunta al stack local (la API en el 54621) o a PILOTO_SUPABASE_URL, a cada función por su nombre', () => {
    hechos({ FAKE_CURL: 'apibara=204 storage-gc=204 avatares-miniaturas=204' })
    hechos({ PILOTO_SUPABASE_URL: 'http://otro:1', FAKE_CURL: 'apibara=204' })
    const urls = readFileSync(join(raiz, 'curl.log'), 'utf8')
    expect(urls).toContain('http://127.0.0.1:54621/functions/v1/apibara\n')
    expect(urls).toContain('http://127.0.0.1:54621/functions/v1/avatares-miniaturas\n')
    expect(urls).toContain('http://otro:1/functions/v1/storage-gc\n')
  })

  it('en un carril lee su `.env.carril`: la API y el candado de su stack', async () => {
    mkdirSync(join(repo, 'scripts/lib'), { recursive: true })
    copyFileSync(resolve('scripts/lib/carril.sh'), join(repo, 'scripts/lib/carril.sh'))
    writeFileSync(
      join(repo, '.env.carril'),
      'SUPABASE_DB_PORT=54722\nPILOTO_SUPABASE_URL=http://127.0.0.1:54721\n',
    )
    const candado = join(raiz, 'candado')
    const dueno = spawn('bash', [resolve('scripts/candado.sh'), 'db:reset', '--', 'cat'], {
      cwd: repo,
      env: { NODE_ENV: 'test', PATH: process.env['PATH'] ?? '', CANDADO_DIR: candado },
      stdio: ['pipe', 'ignore', 'ignore'],
    })
    for (let i = 0; i < 200 && !existsSync(join(candado, 'candado-base-54722.info')); i++) {
      await new Promise((r) => setTimeout(r, 25))
    }
    try {
      expect(hechos({ FAKE_CURL: 'apibara=204' })['candado']).toMatchObject({ libre: false })
      expect(readFileSync(join(raiz, 'curl.log'), 'utf8')).toContain(
        'http://127.0.0.1:54721/functions/v1/apibara\n',
      )
    } finally {
      dueno.stdin.end()
    }
  })
})
