import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  LARGO_MINIMO_DEL_MOTIVO,
  archivosSinCelular,
  ayudantesQueMiden,
  marcasDe,
  marcasDeLosSpecs,
  patronesDePruebasSinCelular,
} from '../../e2e/soporte/sin-celular'

// Por defecto todo spec corre en los dos proyectos. Salir del celular exige marcarlo en el propio spec, con el motivo escrito
// (`// @sin-celular-archivo: …` para el archivo, `// @sin-celular: …` sobre un `test(` para una prueba), y esta guarda lista lo
// marcado y falla si falta el motivo, si es corto, si la marca no está sobre un `test('título', …)`, si el spec pregunta por el
// ancho o mide la disposición, o si la config del proyecto `movil` no deja fuera lo marcado. Quién puede salir lo dice
// `node scripts/comparar-anchos.mjs` (`.claude/rules/e2e.md`).

const RAIZ = process.cwd()
const MOTIVO = 'no depende del ancho: la misma pantalla y los mismos pasos en los dos proyectos'

const prueba = (
  titulo: string,
  cuerpo = '  await page.goto("/")',
  marca = `// @sin-celular: ${MOTIVO}`,
) => `${marca}\ntest('${titulo}', async ({ page }) => {\n${cuerpo}\n})\n`

describe('el lector de las marcas sin celular', () => {
  it('un spec sin marcas corre en los dos proyectos', () => {
    expect(
      marcasDe(`import { test } from './soporte/prueba'\ntest('x', async () => {})\n`),
    ).toEqual({
      motivoDelArchivo: null,
      pruebas: [],
      problemas: [],
    })
  })

  it('el archivo entero: una línea suelta con su motivo', () => {
    const marcas = marcasDe(`// @sin-celular-archivo: ${MOTIVO}\ntest('x', async () => {})\n`)
    expect(marcas.motivoDelArchivo).toBe(MOTIVO)
    expect(marcas.problemas).toEqual([])
  })

  it('una prueba: el comentario justo encima de su test(), con el título', () => {
    const marcas = marcasDe(prueba('una prueba que no mide'))
    expect(marcas.pruebas).toEqual([{ titulo: 'una prueba que no mide', motivo: MOTIVO }])
    expect(marcas.problemas).toEqual([])
  })

  it('sin motivo, o con un motivo corto, falla', () => {
    expect(marcasDe(`// @sin-celular-archivo:\n`).problemas.join(' ')).toContain(
      `al menos ${String(LARGO_MINIMO_DEL_MOTIVO)}`,
    )
    expect(marcasDe(`// @sin-celular-archivo: no importa\n`).problemas).not.toEqual([])
    expect(marcasDe(prueba('x', undefined, '// @sin-celular: corto')).problemas).not.toEqual([])
  })

  it('la marca de una prueba va justo encima de un test() con el título entre comillas', () => {
    const separada = `// @sin-celular: ${MOTIVO}\n\ntest('x', async () => {})\n`
    expect(marcasDe(separada).problemas.join(' ')).toContain('justo encima de un test')
    const plantilla = `// @sin-celular: ${MOTIVO}\ntest(\`x \${y}\`, async () => {})\n`
    expect(marcasDe(plantilla).problemas.join(' ')).toContain('sin plantillas')
    const sangrada = `  // @sin-celular: ${MOTIVO}\n  test('x', async () => {})\n`
    expect(marcasDe(sangrada).problemas).not.toEqual([])
    const alFinal = `test('x', async () => {})\n// @sin-celular: ${MOTIVO}\n`
    expect(marcasDe(alFinal).problemas).not.toEqual([])
  })

  it('el archivo se marca una sola vez y en una línea suelta', () => {
    const dos = `// @sin-celular-archivo: ${MOTIVO}\n// @sin-celular-archivo: ${MOTIVO}\n`
    expect(marcasDe(dos).problemas.join(' ')).toContain('más de una vez')
    expect(marcasDe(`  // @sin-celular-archivo: ${MOTIVO}\n`).problemas).not.toEqual([])
  })

  it('una prueba marcada dos veces se dice', () => {
    const dos = prueba('igual') + prueba('igual')
    expect(marcasDe(dos).problemas.join(' ')).toContain('dos veces')
  })
})

describe('el lector de las marcas sin celular: lo que se contradice', () => {
  it('un spec sin celular que pregunta por el ancho o mide la disposición se contradice', () => {
    for (const uso of [
      'esMovil(page)',
      'isMobile',
      "info.project.name === 'movil'",
      'page.setViewportSize({ width: 400, height: 800 })',
      "document.documentElement.style.fontSize = '200%'",
      'await tactil(page, boton)',
      'await panelDeFiltros(page)',
      'await verEtapa(page, "Nueva")',
      'await sinScrollHorizontal(page)',
    ]) {
      const marcas = marcasDe(
        `// @sin-celular-archivo: ${MOTIVO}\ntest('x', async ({ page }) => {\n  ${uso}\n})\n`,
      )
      expect(marcas.problemas.length, uso).toBeGreaterThan(0)
    }
  })

  it('el nombre del proyecto para nombrar datos no es preguntar por el ancho', () => {
    const marcas = marcasDe(
      `// @sin-celular-archivo: ${MOTIVO}\ntest('x', async ({}, info) => {\n  const nombre = \`Lead \${info.project.name}\`\n})\n`,
    )
    expect(marcas.problemas).toEqual([])
  })

  it('una prueba marcada se contradice dentro de su cuerpo, no en la de al lado', () => {
    const dentro = marcasDe(prueba('x', '  if (esMovil(page)) return'))
    expect(dentro.problemas.length).toBeGreaterThan(0)
    const aLaPar = marcasDe(
      prueba('x') + `\ntest('y', async ({ page }) => {\n  if (esMovil(page)) return\n})\n`,
    )
    expect(aLaPar.problemas).toEqual([])
  })

  it('un comentario que cita el ancho no cuenta', () => {
    const marcas = marcasDe(`// @sin-celular-archivo: ${MOTIVO}\n// esMovil(page) no se usa acá\n`)
    expect(marcas.problemas).toEqual([])
  })
})

describe('los ayudantes que miden el ancho', () => {
  it('los que tocan una primitiva de medida y, transitivamente, los que los llaman; no los que sólo copian el viewport', () => {
    const carpeta = mkdtempSync(join(tmpdir(), 'soporte-'))
    try {
      mkdirSync(carpeta, { recursive: true })
      writeFileSync(
        join(carpeta, 'a.ts'),
        [
          'export async function mide(page) {',
          '  return page.locator("a").boundingBox()',
          '}',
          'export async function llamaAMide(page) {',
          '  await mide(page)',
          '}',
          'export async function noMide(page) {',
          '  await page.goto("/")',
          '}',
          'export async function otraPersona(browser, page) {',
          '  return browser.newContext({ viewport: page.viewportSize() })',
          '}',
          'export const esVerde = (x) => x === "verde"',
        ].join('\n'),
      )
      expect(ayudantesQueMiden(carpeta)).toEqual(['llamaAMide', 'mide'])
    } finally {
      rmSync(carpeta, { recursive: true, force: true })
    }
  })

  it('un spec sin celular que llama a uno de ellos se contradice, y una prueba marcada también', () => {
    const archivo = marcasDe(
      `// @sin-celular-archivo: ${MOTIVO}\ntest('x', async ({ page }) => {\n  await avisoNoTapaElPie(page)\n})\n`,
      ['avisoNoTapaElPie'],
    )
    expect(archivo.problemas.join(' ')).toContain('un ayudante que mide')
    const deUna = marcasDe(prueba('mide una caja', '  await avisoNoTapaElPie(page)'), [
      'avisoNoTapaElPie',
    ])
    expect(deUna.problemas.join(' ')).toContain('mide una caja')
  })

  it('los ayudantes reales de e2e/soporte que miden están a la vista', () => {
    const miden = ayudantesQueMiden(join(RAIZ, 'e2e', 'soporte'))
    for (const nombre of [
      'tactil',
      'sinScrollHorizontal',
      'sinTextoCortado',
      'avisoNoTapaElPie',
      'panelDeFiltros',
      'verEtapa',
    ]) {
      expect(miden, nombre).toContain(nombre)
    }
    expect(miden).not.toContain('otraPersona')
  })
})

describe('lo que el archivo hace para todas sus pruebas o en sus funciones locales', () => {
  it('un beforeEach con el 200 % contradice a toda prueba marcada del archivo', () => {
    const marcas = marcasDe(
      [
        'test.beforeEach(async ({ page }) => {',
        "  await page.evaluate(() => { document.documentElement.style.fontSize = '200%' })",
        '})',
        '',
        prueba('x'),
      ].join('\n'),
    )
    expect(marcas.problemas.join(' ')).toContain('el texto al 200 %')
  })

  it('una función local que mide contradice sólo a la prueba marcada que la llama', () => {
    const spec = (llamada: string) =>
      [
        'async function medirLaCaja(page) {',
        "  return page.locator('a').boundingBox()",
        '}',
        '',
        prueba('x', `  ${llamada}`),
      ].join('\n')
    expect(marcasDe(spec('await medirLaCaja(page)')).problemas.join(' ')).toContain(
      'un ayudante que mide',
    )
    expect(marcasDe(spec('await page.goto("/")')).problemas).toEqual([])
  })
})

describe('el grepInvert del proyecto movil', () => {
  it('cada prueba marcada es un patrón que reconoce su texto de Playwright y sólo el suyo', () => {
    const carpeta = mkdtempSync(join(tmpdir(), 'specs-'))
    try {
      mkdirSync(join(carpeta, 'soporte'), { recursive: true })
      writeFileSync(
        join(carpeta, 'a.spec.ts'),
        prueba('una (prueba) con $especiales? y [corchetes].') + `test('otra', async () => {})\n`,
      )
      const patrones = patronesDePruebasSinCelular(carpeta)
      expect(patrones).toHaveLength(1)
      const [patron] = patrones
      expect(patron?.test('movil a.spec.ts una (prueba) con $especiales? y [corchetes].')).toBe(
        true,
      )
      expect(patron?.test('movil a.spec.ts otra')).toBe(false)
      expect(patron?.test('movil b.spec.ts una (prueba) con $especiales? y [corchetes].')).toBe(
        false,
      )
      // El título de otra prueba que sólo la contiene al final no coincide con otro archivo ni con otra prueba más larga.
      expect(
        patron?.test('movil a.spec.ts una (prueba) con $especiales? y [corchetes]. y más'),
      ).toBe(false)
    } finally {
      rmSync(carpeta, { recursive: true, force: true })
    }
  })
})

describe('los specs sin celular del repo', () => {
  const specs = marcasDeLosSpecs(join(RAIZ, 'e2e'))

  it('hay specs que leer', () => {
    expect(specs.length).toBeGreaterThan(50)
  })

  it('ninguna marca tiene un problema', () => {
    const problemas = specs.flatMap((spec) => spec.problemas.map((p) => `${spec.archivo}: ${p}`))
    expect(problemas).toEqual([])
  })

  // La lista de lo marcado: una prueba por marca, con su motivo en el nombre, para que `pnpm test` la muestre.
  const marcadas = specs.flatMap((spec) => [
    ...(spec.motivoDelArchivo === null
      ? []
      : [{ donde: `${spec.archivo} (el archivo)`, motivo: spec.motivoDelArchivo }]),
    ...spec.pruebas.map((p) => ({ donde: `${spec.archivo} › ${p.titulo}`, motivo: p.motivo })),
  ])
  it.each(marcadas)('sin celular: $donde — $motivo', ({ motivo }) => {
    expect(motivo.trim().length).toBeGreaterThanOrEqual(LARGO_MINIMO_DEL_MOTIVO)
  })

  it('el proyecto movil deja fuera exactamente lo marcado y el de escritorio nada', () => {
    const config = readFileSync(join(RAIZ, 'playwright.config.ts'), 'utf8')
    const aMovil = config.indexOf("name: 'movil'")
    const aEscritorio = config.indexOf("name: 'escritorio'")
    expect(aMovil, 'el proyecto movil no está en la config').toBeGreaterThan(aEscritorio)
    const escritorio = config.slice(aEscritorio, aMovil)
    const movil = config.slice(aMovil)
    expect(movil).toContain("archivosSinCelular('./e2e')")
    expect(movil).toContain("grepInvert: patronesDePruebasSinCelular('./e2e')")
    expect(escritorio).not.toContain('SinCelular')
    expect(escritorio).not.toContain('grepInvert')
    // Lo que la config lee es lo que esta guarda lista.
    expect(archivosSinCelular(join(RAIZ, 'e2e'))).toEqual(
      specs.filter((spec) => spec.motivoDelArchivo !== null).map((spec) => `**/${spec.archivo}`),
    )
    expect(patronesDePruebasSinCelular(join(RAIZ, 'e2e'))).toHaveLength(
      specs
        .filter((spec) => spec.motivoDelArchivo === null)
        .reduce((n, spec) => n + spec.pruebas.length, 0),
    )
  })
})
