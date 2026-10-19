import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  ETIQUETA_SIN_CELULAR,
  LARGO_MINIMO_DEL_MOTIVO,
  archivosSinCelular,
  marcasDe,
  marcasDeLosSpecs,
} from '../../e2e/soporte/sin-celular'

// Por defecto todo spec corre en los dos proyectos. Salir del celular exige marcarlo en el propio spec, con el motivo escrito
// (`sinCelular('…')` para el archivo, `sinCelularEn('…')` para una prueba), y esta guarda lista lo marcado y falla si falta el
// motivo, si es corto, si no es un texto fijo, si el spec pregunta por el ancho o si la config del proyecto `movil` no
// deja fuera exactamente lo marcado. Quién puede salir lo dice `node scripts/comparar-anchos.mjs` (`.claude/rules/e2e.md`).

const RAIZ = process.cwd()
const MOTIVO = 'no depende del ancho: la misma pantalla y los mismos pasos en los dos proyectos'

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

  it('el archivo entero: una llamada al principio de una línea con su motivo', () => {
    const marcas = marcasDe(`sinCelular('${MOTIVO}')\ntest('x', async () => {})\n`)
    expect(marcas.motivoDelArchivo).toBe(MOTIVO)
    expect(marcas.problemas).toEqual([])
  })

  it('una prueba: sinCelularEn(…) como opción de test()', () => {
    const marcas = marcasDe(`test('x', sinCelularEn('${MOTIVO}'), async () => {})\n`)
    expect(marcas.pruebas).toEqual([MOTIVO])
    expect(marcas.problemas).toEqual([])
  })

  it('sin motivo, o con un motivo corto, falla', () => {
    expect(marcasDe(`sinCelular('')\n`).problemas.join(' ')).toContain(
      `al menos ${String(LARGO_MINIMO_DEL_MOTIVO)}`,
    )
    expect(marcasDe(`sinCelular('no importa')\n`).problemas).not.toEqual([])
    expect(marcasDe(`test('x', sinCelularEn('corto'), async () => {})\n`).problemas).not.toEqual([])
  })

  it('el motivo es un texto fijo: ni una variable ni una plantilla con ${…}', () => {
    expect(marcasDe(`sinCelular(MOTIVO)\n`).problemas).not.toEqual([])
    expect(marcasDe('sinCelular(`' + MOTIVO + ' ${otro}`)\n').problemas.join(' ')).toContain(
      'texto fijo',
    )
    expect(marcasDe(`test('x', sinCelularEn(motivo), async () => {})\n`).problemas).not.toEqual([])
  })

  it('sinCelular() de todo el archivo va en el nivel superior y una sola vez', () => {
    expect(
      marcasDe(`describe('a', () => {\n  sinCelular('${MOTIVO}')\n})\n`).problemas,
    ).not.toEqual([])
    expect(
      marcasDe(`sinCelular('${MOTIVO}')\nsinCelular('${MOTIVO}')\n`).problemas.join(' '),
    ).toContain('más de una vez')
  })

  it('un comentario con la llamada no cuenta', () => {
    expect(marcasDe(`// sinCelular('${MOTIVO}')\n`).motivoDelArchivo).toBeNull()
  })

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
        `sinCelular('${MOTIVO}')\ntest('x', async ({ page }) => {\n  ${uso}\n})\n`,
      )
      expect(marcas.problemas.length, uso).toBeGreaterThan(0)
    }
  })

  it('el nombre del proyecto para nombrar datos no es preguntar por el ancho', () => {
    const marcas = marcasDe(
      `sinCelular('${MOTIVO}')\ntest('x', async ({}, info) => {\n  const nombre = \`Lead \${info.project.name}\`\n})\n`,
    )
    expect(marcas.problemas).toEqual([])
  })

  it('una prueba marcada se contradice dentro de su cuerpo, no en la de al lado', () => {
    const dentro = marcasDe(
      `test('x', sinCelularEn('${MOTIVO}'), async ({ page }) => {\n  if (esMovil(page)) return\n})\n`,
    )
    expect(dentro.problemas.length).toBeGreaterThan(0)
    const aLaPar = marcasDe(
      `test('x', sinCelularEn('${MOTIVO}'), async () => {\n  await hacer()\n})\n\ntest('y', async ({ page }) => {\n  if (esMovil(page)) return\n})\n`,
    )
    expect(aLaPar.problemas).toEqual([])
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
    ...spec.pruebas.map((motivo) => ({ donde: `${spec.archivo} (una prueba)`, motivo })),
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
    expect(movil).toContain('archivosSinCelular(')
    expect(movil).toContain(`grepInvert: /${ETIQUETA_SIN_CELULAR}/`)
    expect(escritorio).not.toContain('archivosSinCelular')
    expect(escritorio).not.toContain('grepInvert')
    // Lo que la config lee es lo que esta guarda lista.
    expect(archivosSinCelular(join(RAIZ, 'e2e'))).toEqual(
      specs.filter((spec) => spec.motivoDelArchivo !== null).map((spec) => `**/${spec.archivo}`),
    )
  })
})
