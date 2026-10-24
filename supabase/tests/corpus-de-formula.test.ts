import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { formulaSintetica } from '@/modules/cotizaciones/entities/formula-sintetica'
import { REGLAS_DE_FORMULA } from '@/modules/cotizaciones/entities/motivos-de-formula'
import { validarFormula } from '@/modules/cotizaciones/entities/validar'
import { corpusComoTexto, generarCorpus, SEMILLA, type Base } from './corpus-de-formula'

// Las rutas van por variables (Vite reescribe un `new URL('literal', import.meta.url)`).
const JUEGO = 'src/modules/cotizaciones/entities/casos-de-formula.json'
const CORPUS = 'supabase/tests/corpus-de-formula.json'
const REGENERAR = 'ACTUALIZAR_CORPUS=1 pnpm vitest run supabase/tests/corpus-de-formula.test.ts'

const juego = JSON.parse(readFileSync(JUEGO, 'utf8')) as { casos: (Base & { valida: boolean })[] }
const bases: Base[] = juego.casos
  // Los «compilada: …» salen del compilador de texto (4.07) y los «texto: …» son casos a mano del `texto` de una fila: no son bases
  // del corpus, no lo mutan.
  .filter((c) => c.valida && !c.nombre.startsWith('compilada: ') && !c.nombre.startsWith('texto: '))
  .map(({ nombre, definicion, params }) => ({
    nombre: nombre.startsWith('semilla: ')
      ? nombre.slice('semilla: '.length)
      : nombre.includes('Amnistia')
        ? 'amnistia'
        : 'excel',
    definicion,
    params,
  }))
const casos = generarCorpus(bases)
const sinteticas = { chica: formulaSintetica(200), grande: formulaSintetica(2000) }
const texto = corpusComoTexto(SEMILLA, casos, sinteticas)

describe('corpus-de-formula.json', () => {
  it(`está al día con su generador (para regenerarlo: ${REGENERAR})`, () => {
    if (process.env['ACTUALIZAR_CORPUS'] === '1') writeFileSync(CORPUS, texto)
    const guardado = existsSync(CORPUS) ? readFileSync(CORPUS, 'utf8') : ''
    if (guardado === texto) return
    // Dice el primer caso distinto, no el archivo entero.
    const [a, b] = [guardado.split('\n'), texto.split('\n')]
    const i = b.findIndex((linea, k) => linea !== a[k])
    expect.fail(
      `el corpus guardado no es el que genera el código (línea ${String(i + 1)}: ${(b[i] ?? '').slice(0, 160)}). ${REGENERAR}`,
    )
  })

  it('trae las 4 fórmulas válidas como bases: las dos del seed, el Excel entero y «Amnistia»', () => {
    expect(bases.map((b) => b.nombre)).toEqual(['subasta_usa', 'oficina', 'excel', 'amnistia'])
  })

  it('tiene al menos 400 casos, cada regla es el primer rechazo de al menos 5, y mezcla defectos', () => {
    expect(casos.length).toBeGreaterThanOrEqual(400)
    const porRegla = new Map<string, number>()
    for (const c of casos) {
      if (c.motivo) porRegla.set(c.motivo.regla, (porRegla.get(c.motivo.regla) ?? 0) + 1)
    }
    for (const regla of REGLAS_DE_FORMULA)
      expect(porRegla.get(regla) ?? 0, regla).toBeGreaterThanOrEqual(5)
    expect(casos.filter((c) => c.mutaciones.length >= 2).length).toBeGreaterThanOrEqual(200)
    expect(casos.filter((c) => c.valida).length).toBeGreaterThanOrEqual(15)
    expect(new Set(casos.map((c) => c.nombre)).size).toBe(casos.length)
  })

  it('el esperado de cada caso es lo que dice validarFormula sobre lo guardado', () => {
    for (const c of casos) {
      const r = validarFormula(c.definicion, c.params)
      expect(r.ok ? undefined : { regla: r.error.regla, donde: r.error.donde }, c.nombre).toEqual(
        c.motivo ? { regla: c.motivo.regla, donde: c.motivo.donde } : undefined,
      )
    }
  })

  it('las sintéticas de escala validan, con 200 y 2.000 nodos', () => {
    expect(sinteticas.chica.definicion.nodos).toHaveLength(200)
    expect(sinteticas.grande.definicion.nodos).toHaveLength(2000)
    expect(validarFormula(sinteticas.chica.definicion, sinteticas.chica.params).ok).toBe(true)
    expect(validarFormula(sinteticas.grande.definicion, sinteticas.grande.params).ok).toBe(true)
  })
})
