import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  excepcionesDeTerceros,
  jobsDe,
  problemasDeAcciones,
  problemasDePlaywright,
  problemasDelWorkflow,
} from './workflows'

// Las reglas de CI (`docs/DECISIONES.md`, «CI-1»): cada job con su tope de minutos, permisos de lectura, acciones fijadas por SHA y
// sólo de GitHub (o con su excepción escrita), nada de `latest`, lo que mide tiempo fuera de CI (docs/PLAN.md, 9-4 a 9-6), el e2e en
// bloques con E2E_COMPLETO y escritorio o ambos, el diff con la historia entera y Playwright sin reintentos.
const WORKFLOWS = '.github/workflows'
const ACCIONES = '.github/acciones'
const CI = `${WORKFLOWS}/ci.yml`

const leer = (ruta: string) => readFileSync(ruta, 'utf8')
const ci = leer(CI)

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
    expect(problemasDelWorkflow(leer(`${WORKFLOWS}/${nombre}`), nombre)).toEqual([])
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
      'cambios',
      'base',
      'e2e-build',
      'e2e',
    ])
  })
})

// Cada mutación rompe una regla en el ci.yml real y la guarda tiene que caer con el motivo.
describe('las mutaciones caen', () => {
  const casos: [string, string | RegExp, string, RegExp][] = [
    [
      'un job sin timeout-minutes',
      /( {4}timeout-minutes: 5\n)/,
      '',
      /job cambios no tiene timeout-minutes/,
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
    ['sin fetch-depth: 0', 'fetch-depth: 0', 'fetch-depth: 1', /no pide fetch-depth: 0/],
    ['el e2e sin bloques', '--shard=${{ matrix.bloque }}/4 ', '', /sin bloques/],
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
