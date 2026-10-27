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

// `verificar.sh` lo corre el bucle (no la sesión) después de un paso «listo»: no le cree al modelo. Lint, typecheck, test y el mapa;
// `db:probar` si el rango toca `supabase/`; y los e2e dirigidos que lista `ultimo.json`, en escritorio y, sólo si `nivel.mjs` dice
// que el rango toca interfaz, también en móvil ([cambio 7]). Deja la huella verde sólo si todo pasó. Se prueba con un `pnpm` falso
// que registra sus argumentos, en un repo temporal.
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
  it('lint, typecheck, test y el mapa, en ese orden, y deja la huella verde', () => {
    commitear('docs/ESTADO.md')
    const r = verificar()
    expect(r.estado, r.salida).toBe(0)
    expect(llamadas()).toEqual(['pnpm lint', 'pnpm typecheck', 'pnpm test', 'mapa --check'])
    expect(readFileSync(HUELLA(), 'utf8').trim()).toBe(
      execFileSync('bash', [join(bin, 'huella.sh')], { cwd: repo, encoding: 'utf8' }).trim(),
    )
  })

  it('un rango que toca supabase/ suma db:probar, después del mapa', () => {
    commitear('supabase/migrations/20261020000000_x.sql', 'create index x on leads (id);\n')
    expect(verificar().estado).toBe(0)
    expect(llamadas()).toEqual([
      'pnpm lint',
      'pnpm typecheck',
      'pnpm test',
      'mapa --check',
      'pnpm db:probar',
    ])
  })

  it('un rango que no toca supabase/ no corre db:probar', () => {
    commitear('src/modules/leads/entities/x.ts')
    verificar()
    expect(llamadas()).not.toContain('pnpm db:probar')
  })
})

describe('verificar.sh › los e2e dirigidos', () => {
  const SPECS = ['e2e/leads.spec.ts', 'e2e/vehiculos.spec.ts']

  it('sin interfaz en el rango: sólo el proyecto escritorio', () => {
    commitear('src/modules/leads/entities/permisos.ts')
    expect(verificar(SPECS).estado).toBe(0)
    expect(llamadas().at(-1)).toBe(
      'pnpm test:e2e e2e/leads.spec.ts e2e/vehiculos.spec.ts --project=escritorio',
    )
  })

  it('con interfaz en el rango: escritorio y móvil', () => {
    commitear('src/modules/leads/features/tabla/tabla.tsx')
    expect(verificar(SPECS).estado).toBe(0)
    expect(llamadas().at(-1)).toBe(
      'pnpm test:e2e e2e/leads.spec.ts e2e/vehiculos.spec.ts --project=escritorio --project=movil',
    )
  })

  it('una hoja de estilos o un cambio en src/shared/ui también es interfaz', () => {
    commitear('src/shared/ui/boton.tsx')
    verificar(SPECS)
    expect(llamadas().at(-1)).toContain('--project=movil')
  })

  // La guardia de `e2e/global-setup.ts` exige las tres funciones edge para cualquier spec, y el bucle no las levanta: sin la
  // variable, el 4.13-3b cayó antes de la primera prueba. Un spec que llama a una función de verdad falla solo sin ella.
  it('corren con E2E_SIN_FUNCIONES=1 aunque el bucle no la traiga en su entorno', () => {
    commitear('src/modules/leads/features/tabla/tabla.tsx')
    expect(verificar(SPECS).estado).toBe(0)
    expect(readFileSync(join(raiz, 'entorno-e2e.txt'), 'utf8').trim()).toBe('E2E_SIN_FUNCIONES=1')
  })

  it('sin e2e dirigidos no corre ninguno', () => {
    commitear('src/modules/leads/features/tabla/tabla.tsx')
    verificar([])
    expect(llamadas().some((l) => l.includes('test:e2e'))).toBe(false)
  })
})

describe('verificar.sh › cuando algo falla', () => {
  it.each(['lint', 'typecheck', 'test', 'test:e2e'])(
    '«%s» rojo: sale con 1, lo dice y no deja la huella',
    (falla) => {
      commitear('src/modules/leads/features/tabla/tabla.tsx')
      const r = verificar(['e2e/leads.spec.ts'], { FAKE_FALLA: falla })
      expect(r.estado).toBe(1)
      expect(r.salida).toContain('verificar')
      expect(existsSync(HUELLA())).toBe(false)
    },
  )

  it('para en el primer rojo: lo que sigue no corre', () => {
    commitear('docs/ESTADO.md')
    verificar([], { FAKE_FALLA: 'typecheck' })
    expect(llamadas()).toEqual(['pnpm lint', 'pnpm typecheck'])
  })

  it('el mapa desactualizado es un rojo', () => {
    commitear('docs/ESTADO.md')
    writeFileSync(join(repo, 'scripts/mapa.sh'), 'exit 1\n')
    expect(verificar().estado).toBe(1)
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

// El bucle arma el aviso con la última línea de stderr (`cierre.sh`): tiene que ser la causa, no el pie de Playwright, que es lo que
// citó el aviso del 4.13-3b («pnpm exec playwright show-report», «ELIFECYCLE»).
describe('verificar.sh › la última línea dice la causa', () => {
  const ESC = '\u001b'
  const PIE = [
    '[e2e] Falló: los artefactos quedaron en e2e-fallos/2026-10-27_06-42/.',
    'To open last HTML report run:',
    `${ESC}[36m  pnpm exec playwright show-report${ESC}[39m`,
    '[ELIFECYCLE] Command failed with exit code 1.',
  ]
  const ultimaLinea = (salida: string) => salida.trimEnd().split('\n').at(-1)

  function fallarE2e(lineas: string[]) {
    commitear('src/modules/leads/features/tabla/tabla.tsx')
    return verificar(['e2e/leads.spec.ts'], {
      FAKE_FALLA: 'test:e2e',
      FAKE_SALIDA: lineas.join('\n'),
    })
  }

  it('la primera línea «Error:» del log, sin colores ni sangría, y no el pie', () => {
    const r = fallarE2e([
      '  ✘  1 [escritorio] › e2e/leads.spec.ts:12:5 › un título (5.0s)',
      `${ESC}[31m  Error: Las funciones edge no están servidas (apibara, storage-gc)${ESC}[39m`,
      '   at soporte/guardia.ts:38',
      'Error: otra, que no es la primera',
      ...PIE,
    ])
    expect(r.estado).toBe(1)
    expect(ultimaLinea(r.salida)).toBe(
      'verificar: e2e falló: Error: Las funciones edge no están servidas (apibara, storage-gc)',
    )
  })

  it('sin «Error:», la primera con ✘, FAIL o error', () => {
    const r = fallarE2e([
      'Running 2 tests using 1 worker',
      '  ✘  1 [escritorio] › e2e/leads.spec.ts:12:5 › un título (5.0s)',
      ...PIE,
    ])
    expect(ultimaLinea(r.salida)).toBe(
      'verificar: e2e falló: ✘  1 [escritorio] › e2e/leads.spec.ts:12:5 › un título (5.0s)',
    )
  })

  it('sin ninguna, remite al log completo', () => {
    const r = fallarE2e(['una línea cualquiera', 'To open last HTML report run:'])
    expect(ultimaLinea(r.salida)).toMatch(/^verificar: e2e falló: ver \S+\/verificar-e2e\.log$/)
  })

  it('una causa larga se corta en 200 caracteres, no en 200 bytes', () => {
    const larga = `Error: ${'ñ'.repeat(300)}`
    const r = fallarE2e([larga, ...PIE])
    expect(ultimaLinea(r.salida)).toBe(`verificar: e2e falló: ${larga.slice(0, 200)}`)
  })
})

// Con un e2e rojo, la causa nombra la prueba: Playwright imprime «  1) [proyecto] › spec:línea:col › título ───» antes de su «Error:».
// El aviso del 4.13-3b no decía qué prueba había caído.
describe('verificar.sh › la causa de un e2e rojo nombra la prueba', () => {
  const ESC = '\u001b'
  const TITULO =
    '[escritorio] › e2e/cotizar-guardar-intento.spec.ts:33:5 › con la respuesta perdida, el próximo guardado manda el pedido viejo'
  const ultimaLinea = (salida: string) => salida.trimEnd().split('\n').at(-1)
  function fallarE2e(lineas: string[]) {
    commitear('src/modules/leads/features/tabla/tabla.tsx')
    return verificar(['e2e/leads.spec.ts'], {
      FAKE_FALLA: 'test:e2e',
      FAKE_SALIDA: lineas.join('\n'),
    })
  }

  it('«[proyecto] › spec › prueba — Error: …», sin la numeración, los ─ ni los colores', () => {
    const r = fallarE2e([
      'Running 6 tests using 1 worker',
      '',
      `${ESC}[31m  1) ${TITULO} ${'─'.repeat(40)}${ESC}[39m`,
      '',
      '    Error: expect(locator).toBeVisible() failed',
      '    Error: element(s) not found',
      '[ELIFECYCLE] Command failed with exit code 1.',
    ])
    expect(ultimaLinea(r.salida)).toBe(
      `verificar: e2e falló: ${TITULO} — Error: expect(locator).toBeVisible() failed`,
    )
  })

  it('sin «Error:» después de la cabecera, la cabecera sola', () => {
    const r = fallarE2e(['Error: de antes, de otra cosa', `  1) ${TITULO} ───`, '    Timeout'])
    expect(ultimaLinea(r.salida)).toBe(`verificar: e2e falló: ${TITULO}`)
  })

  it('con la prueba, se corta en 300 caracteres', () => {
    const titulo = `[movil] › e2e/x.spec.ts:1:1 › ${'ñ'.repeat(400)}`
    const r = fallarE2e([`  1) ${titulo}`, '    Error: algo'])
    expect(ultimaLinea(r.salida)).toBe(`verificar: e2e falló: ${titulo.slice(0, 300)}`)
  })
})
