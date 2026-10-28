import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  excepcionesDeTerceros,
  funcionesDeLaGuardia,
  jobsDe,
  problemasDeAcciones,
  problemasDeEsperaDeFunciones,
  problemasDePlaywright,
  problemasDelWorkflow,
} from './workflows'

// Las reglas de CI (`docs/DECISIONES.md`, «CI-1»): cada job con su tope de minutos, permisos de lectura, acciones fijadas por SHA y
// sólo de GitHub (o con su excepción escrita), nada de `latest`, lo que mide tiempo fuera de CI (docs/PLAN.md, 9-4 a 9-6), el e2e en
// bloques con E2E_COMPLETO y escritorio o ambos, el diff con la historia entera y Playwright sin reintentos. Desde CI-1b: un dispatch
// con su propio grupo y sin cancelarse, `db:carreras` sólo en su job manual con su input apagado, y la espera de cada función edge.
const WORKFLOWS = '.github/workflows'
const ACCIONES = '.github/acciones'
const CI = `${WORKFLOWS}/ci.yml`

const leer = (ruta: string) => readFileSync(ruta, 'utf8')
const ci = leer(CI)
const FUNCIONES = funcionesDeLaGuardia(leer('e2e/soporte/guardia.ts'))

// Cambia `antes` por `despues` exactamente una vez: la mutación tiene que tocar el archivo real.
function mutar(texto: string, antes: string | RegExp, despues: string): string {
  const mutado = texto.replace(antes, despues)
  expect(mutado, `la mutación no encontró ${String(antes)}`).not.toBe(texto)
  return mutado
}

const problemasDe = (texto: string) => problemasDelWorkflow(texto, CI)

describe('los workflows del repo cumplen', () => {
  const workflows = readdirSync(WORKFLOWS).filter((n) => /\.ya?ml$/.test(n))

  it('hay al menos uno (ci.yml)', () => {
    expect(workflows).toContain('ci.yml')
  })

  it.each(workflows)('%s', (nombre) => {
    const texto = leer(`${WORKFLOWS}/${nombre}`)
    expect([
      ...problemasDelWorkflow(texto, nombre),
      ...problemasDeEsperaDeFunciones(texto, nombre, FUNCIONES),
    ]).toEqual([])
  })

  it('lee las funciones de e2e/soporte/guardia.ts', () => {
    expect(FUNCIONES).toContain('apibara')
    expect(FUNCIONES.length).toBeGreaterThan(1)
  })

  const compuestas = existsSync(ACCIONES)
    ? readdirSync(ACCIONES)
        .map((d) => `${ACCIONES}/${d}/action.yml`)
        .filter((ruta) => existsSync(ruta))
    : []

  it.each(compuestas)('la acción compuesta %s', (ruta) => {
    expect(problemasDeAcciones(leer(ruta), ruta)).toEqual([])
  })

  it('playwright.config.ts no reintenta', () => {
    expect(problemasDePlaywright(leer('playwright.config.ts'))).toEqual([])
  })

  it('lee los jobs de ci.yml', () => {
    expect(jobsDe(ci).map((j) => j.nombre)).toEqual([
      'nivel-1',
      'carriles',
      'cambios',
      'base',
      'carreras',
      'e2e-build',
      'e2e',
    ])
  })
})

// Cada mutación rompe una regla en el ci.yml real y la guarda tiene que caer con el motivo.
// CI por niveles y carriles (docs/ORCA.md): la guarda de carriles en cada PR, sobre todo el diff; los e2e del PR según
// scripts/e2e-dirigidos.mjs; el completo cada noche.
describe('ci.yml por niveles y carriles', () => {
  const job = (nombre: string) => jobsDe(ci).find((j) => j.nombre === nombre)?.bloque ?? ''

  it('el job carriles corre en cada PR, con la historia entera, la guarda de carriles', () => {
    const carriles = job('carriles')
    expect(carriles).toMatch(/if: github\.event_name == 'pull_request'/)
    expect(carriles).toMatch(/fetch-depth: 0/)
    expect(carriles).toContain('node scripts/guardas/carriles.mjs "$BASE_PR" "$RAMA"')
  })

  it('el PR elige sus e2e con scripts/e2e-dirigidos.mjs, y la matriz y los specs salen de esa elección', () => {
    expect(job('cambios')).toContain(
      'node scripts/e2e-dirigidos.mjs --rango "$BASE_PR...HEAD" --github',
    )
    expect(job('e2e')).toContain('fromJSON(needs.cambios.outputs.e2e_bloques')
    expect(job('e2e')).toContain('"${especs[@]}"')
    for (const nombre of ['e2e', 'e2e-build']) {
      expect(job(nombre)).toContain("needs.cambios.outputs.e2e_modo != 'ninguno'")
    }
  })

  it('cada noche corre el completo (schedule), sólo si hubo commits', () => {
    expect(ci).toMatch(/^ {2}schedule:\n {4}- cron: '[^']+'/m)
    expect(leer('scripts/ci-cambios.sh')).toMatch(/schedule\)/)
  })
})

describe('las mutaciones caen', () => {
  const casos: [string, string | RegExp, string, RegExp][] = [
    [
      'un job sin timeout-minutes',
      /( {4}timeout-minutes: 5\n)/,
      '',
      /job carriles no tiene timeout-minutes/,
    ],
    [
      'una acción de GitHub por tag',
      /actions\/checkout@[0-9a-f]{40}/,
      'actions/checkout@v7',
      /actions\/checkout@v7 no está fijada por SHA/,
    ],
    [
      'una acción de terceros sin excepción',
      /actions\/cache@([0-9a-f]{40})/,
      'pnpm/action-setup@$1',
      /pnpm\/action-setup es de terceros y no está en la lista/,
    ],
    ['«latest»', 'runs-on: ubuntu-24.04', 'runs-on: ubuntu-latest', /«latest» no fija versión/],
    [
      'las carreras en CI',
      '- run: pnpm db:lint',
      '- run: pnpm db:carreras',
      /db:carreras no corre en CI/,
    ],
    [
      'la medición en CI',
      '- run: pnpm db:lint',
      '- run: pnpm db:medir:volumen',
      /db:medir no corre en CI/,
    ],
    [
      'el completo local en CI',
      '- run: pnpm db:lint',
      '- run: pnpm test:e2e:completo',
      /test:e2e:completo no corre/,
    ],
    [
      'sin fetch-depth: 0',
      /(todo cae a «pesado».\n\s+)fetch-depth: 0/,
      '$1fetch-depth: 1',
      /no pide fetch-depth: 0/,
    ],
    ['el e2e sin bloques', '--shard=${{ matrix.bloque }}/"$DE" ', '', /sin bloques/],
    ['el e2e sin E2E_COMPLETO', "E2E_COMPLETO: '1'", "E2E_COMPLETO: '0'", /sin E2E_COMPLETO=1/],
    ['el e2e sólo en celular', '--project=escritorio', '--project=movil', /--project=movil/],
    ['sin el input proyectos', 'default: escritorio', 'default: ambos', /input «proyectos»/],
    [
      'sin permisos de sólo lectura',
      'contents: read',
      'contents: write',
      /contents: read|escritura/,
    ],
  ]

  it.each(casos)('%s', (_, antes, despues, motivo) => {
    const problemas = problemasDe(mutar(ci, antes, despues))
    expect(problemas.join('\n')).toMatch(motivo)
  })

  it('Playwright con un reintento', () => {
    const config = mutar(leer('playwright.config.ts'), 'retries: 0', 'retries: 1')
    expect(problemasDePlaywright(config)).not.toEqual([])
  })
})

// CI-1b: el dispatch con su grupo y sin cancelarse, `db:carreras` sólo en su job manual y la espera de cada función edge.
describe('las mutaciones de CI-1b caen', () => {
  const casos: [string, string | RegExp, string, RegExp][] = [
    [
      'un solo grupo de concurrency (el de CI-1)',
      /^ {2}group: .+\n {2}cancel-in-progress: .+$/m,
      '  group: ci-${{ github.head_ref || github.ref }}\n  cancel-in-progress: true',
      /un workflow_dispatch necesita su propio grupo[^\n]*\n[^\n]*cancel-in-progress tiene que ser/,
    ],
    [
      'el dispatch se cancela',
      /^ {2}cancel-in-progress: .+$/m,
      '  cancel-in-progress: true',
      /cancel-in-progress tiene que ser/,
    ],
    [
      'push y PR dejan de cancelar',
      /^ {2}cancel-in-progress: .+$/m,
      '  cancel-in-progress: false',
      /cancel-in-progress tiene que ser/,
    ],
    [
      'el grupo manual sin run_id',
      ', github.run_id)',
      ')',
      /un workflow_dispatch necesita su propio grupo/,
    ],
    [
      'el job carreras sin su if',
      /^ {4}if: github\.event_name == 'workflow_dispatch' && inputs\.carreras\n/m,
      '',
      /db:carreras no corre en CI/,
    ],
    [
      'el job carreras sin workflow_dispatch en su if',
      "if: github.event_name == 'workflow_dispatch' && inputs.carreras",
      'if: inputs.carreras',
      /db:carreras no corre en CI/,
    ],
    [
      'el job carreras con otro if',
      "if: github.event_name == 'workflow_dispatch' && inputs.carreras",
      "if: github.event_name == 'workflow_dispatch' || inputs.carreras",
      /db:carreras no corre en CI/,
    ],
    [
      'el input carreras encendido por defecto',
      /( {6}carreras:\n(?: {8}.*\n)*? {8}default: )false/,
      '$1true',
      /input «carreras»/,
    ],
    [
      'carreras.mjs en el job carreras',
      '- run: pnpm db:carreras',
      '- run: node scripts/carreras.mjs',
      /carreras\.mjs no corre en CI/,
    ],
  ]

  it.each(casos)('%s', (_, antes, despues, motivo) => {
    const problemas = problemasDe(mutar(ci, antes, despues))
    expect(problemas.join('\n')).toMatch(motivo)
  })

  it('la espera de funciones sin storage-gc', () => {
    const texto = mutar(ci, /(funciones="[^"]*?) ?storage-gc/, '$1')
    expect(problemasDeEsperaDeFunciones(texto, CI, FUNCIONES).join('\n')).toMatch(
      /no prueba storage-gc/,
    )
  })

  it('la espera de funciones que vuelve a mirar sólo apibara', () => {
    const texto = mutar(ci, /for (\w+) in \$funciones/, 'for $1 in apibara')
    expect(problemasDeEsperaDeFunciones(texto, CI, FUNCIONES).join('\n')).toMatch(
      /no recorre funciones=/,
    )
  })
})

describe('la lista de excepciones de terceros', () => {
  const uso = '      - uses: pnpm/action-setup@0123456789abcdef0123456789abcdef01234567\n'
  const motivo = 'la instalación de pnpm con firma que npm no ofrece todavía'
  const conPaso = (cabecera: string) =>
    mutar(ci, '      - run: pnpm lint\n', `${uso}      - run: pnpm lint\n`).replace(
      '# Hoy ninguna',
      `${cabecera}\n# Hoy ninguna`,
    )

  it('hoy está vacía', () => {
    expect(excepcionesDeTerceros(ci)).toEqual([])
  })

  it('una excepción con su motivo admite la acción', () => {
    expect(problemasDe(conPaso(`# accion-de-terceros: pnpm/action-setup — ${motivo}`))).toEqual([])
  })

  it('una excepción sin motivo cae', () => {
    expect(
      problemasDe(conPaso('# accion-de-terceros: pnpm/action-setup — porque sí')).join('\n'),
    ).toMatch(/no dice su motivo/)
  })

  it('una excepción que nadie usa cae', () => {
    const texto = ci.replace(
      '# Hoy ninguna',
      `# accion-de-terceros: pnpm/action-setup — ${motivo}\n# Hoy ninguna`,
    )
    expect(problemasDe(texto).join('\n')).toMatch(/no la usa ningún paso/)
  })

  it('aun con excepción, sin SHA cae', () => {
    const texto = conPaso(`# accion-de-terceros: pnpm/action-setup — ${motivo}`).replace(
      'pnpm/action-setup@0123456789abcdef0123456789abcdef01234567',
      'pnpm/action-setup@v4',
    )
    expect(problemasDe(texto).join('\n')).toMatch(/no está fijada por SHA/)
  })
})
